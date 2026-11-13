(() => {
      "use strict";
      const params = new URLSearchParams(location.search);
      const playlistId = params.get("playlist") || "";
      const parentOrigin = params.get("parent") || "";
      const indexValue = Number(params.get("index") || 0);
      const startValue = Number(params.get("start") || 0);
      const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
      const playlistIdPattern = /^PL[A-Za-z0-9_-]{8,}$/;
      const targetOrigin = window.PactusIsolatedOriginPolicy?.allowParent(parentOrigin) || "";
      const status = document.getElementById("status");
      let player = null;
      let listTimer = 0;
      let saveTimer = 0;
      let listAttempts = 0;
      let lastListSignature = "";
      let stableSamples = 0;
      let lastProgress = { videoOrder: [], videoTitles: {}, currentVideoId: "", currentTitle: "", currentIndex: 0, currentSeconds: 0, videoCount: 0 };

      function send(message) {
        if (targetOrigin) window.parent.postMessage(message, targetOrigin);
      }

      function checkpoint(completedVideoId) {
        if (!player) return;
        const order = (player.getPlaylist?.() || lastProgress.videoOrder)
          .filter((id) => typeof id === "string" && videoIdPattern.test(id))
          .slice(0, 600);
        const playerIndex = Number(player.getPlaylistIndex?.());
        const data = player.getVideoData?.() || {};
        const id = videoIdPattern.test(data.video_id || "") ? data.video_id : (order[playerIndex] || lastProgress.currentVideoId);
        const rawSeconds = Number(player.getCurrentTime?.());
        const seconds = Number.isFinite(rawSeconds) ? Math.max(0, Math.min(86400, Math.floor(rawSeconds))) : lastProgress.currentSeconds;
        const title = typeof data.title === "string" ? data.title.trim().slice(0, 240) : "";
        const titles = { ...lastProgress.videoTitles };
        if (id && title) titles[id] = title;
        const index = Number.isInteger(playerIndex) && playerIndex >= 0 && playerIndex < 600 ? playerIndex : lastProgress.currentIndex;
        lastProgress = {
          videoOrder: order.length ? order : lastProgress.videoOrder,
          videoTitles: titles,
          currentVideoId: id,
          currentTitle: title || (id ? titles[id] || lastProgress.currentTitle : lastProgress.currentTitle),
          currentIndex: index,
          currentSeconds: completedVideoId ? Math.floor(Number(player.getDuration?.()) || seconds) : seconds,
          videoCount: order.length || lastProgress.videoCount,
        };
        send({
          type: "progress",
          ...lastProgress,
          ...(completedVideoId && videoIdPattern.test(completedVideoId) ? { completedVideoId } : {}),
        });
      }

      function acceptCommand(event) {
        if (event.source !== window.parent || event.origin !== targetOrigin || !event.data || typeof event.data !== "object") return;
        const command = event.data;
        if (!player) return;
        if (command.type === "select" && Number.isInteger(command.index) && command.index >= 0 && command.index < 600) {
          const seconds = Number.isInteger(command.seconds) ? Math.max(0, Math.min(86400, command.seconds)) : 0;
          player.cuePlaylist({ listType: "playlist", list: playlistId, index: command.index, startSeconds: seconds });
          return;
        }
        if (command.type === "play") player.playVideo();
      }

      function onApiReady() {
        if (!window.YT || !window.YT.Player) {
          status.textContent = "O player do YouTube não ficou disponível.";
          send({ type: "error", code: 0 });
          return;
        }
        player = new window.YT.Player("player", {
          width: "100%",
          height: "100%",
          playerVars: {
            listType: "playlist",
            list: playlistId,
            index: Math.max(0, Math.min(599, Number.isInteger(indexValue) ? indexValue : 0)),
            playsinline: 1,
            rel: 0,
            origin: location.origin,
          },
          events: {
            onReady(event) {
              status.remove();
              const startSeconds = Math.max(0, Math.min(86400, Number.isInteger(startValue) ? startValue : 0));
              event.target.cuePlaylist({ listType: "playlist", list: playlistId, index: Math.max(0, Math.min(599, indexValue)), startSeconds });
              send({ type: "ready" });
              let cueStartedAt = Date.now();
              listTimer = window.setInterval(() => {
                listAttempts += 1;
                const order = (event.target.getPlaylist?.() || []).filter((id) => typeof id === "string" && videoIdPattern.test(id)).slice(0, 600);
                if (order.length) {
                  const signature = order.join(",");
                  stableSamples = signature === lastListSignature ? stableSamples + 1 : 1;
                  lastListSignature = signature;
                  if (stableSamples >= 3 && Date.now() - cueStartedAt >= 2000) {
                    const old = lastProgress;
                    const titles = { ...old.videoTitles };
                    const data = event.target.getVideoData?.() || {};
                    if (data.video_id && data.title) titles[data.video_id] = String(data.title).slice(0, 240);
                    lastProgress = { ...old, videoOrder: order, videoTitles: titles, videoCount: order.length };
                    send({ type: "playlist", videoOrder: order, videoTitles: titles });
                    checkpoint();
                    window.clearInterval(listTimer);
                  }
                }
                if (listAttempts >= 30 && stableSamples < 3) {
                  window.clearInterval(listTimer);
                  send({ type: "error", code: 100 });
                }
              }, 400);
              saveTimer = window.setInterval(() => checkpoint(), 5000);
            },
            onStateChange(event) {
              const states = window.YT.PlayerState;
              if (event.data === states.PLAYING) {
                send({ type: "state", state: "PLAYING" });
                checkpoint();
              } else if (event.data === states.PAUSED) {
                send({ type: "state", state: "PAUSED" });
                checkpoint();
              } else if (event.data === states.ENDED) {
                const id = event.target.getVideoData?.().video_id || "";
                send({ type: "state", state: "ENDED" });
                checkpoint(id);
              } else if (event.data === states.BUFFERING) {
                send({ type: "state", state: "BUFFERING" });
              } else if (event.data === states.CUED) {
                send({ type: "state", state: "CUED" });
              }
            },
            onError(event) {
              status.textContent = "Esta aula está indisponível para reprodução incorporada.";
              send({ type: "error", code: Number(event.data) || 0 });
            },
          },
        });
      }

      if (!targetOrigin || !playlistIdPattern.test(playlistId)) {
        status.textContent = "Não foi possível iniciar o player isolado.";
        return;
      }
      window.addEventListener("message", acceptCommand);
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        status.textContent = "Não foi possível carregar o YouTube.";
        send({ type: "error", code: 0 });
      };
      window.onYouTubeIframeAPIReady = onApiReady;
      document.head.appendChild(script);
      window.addEventListener("pagehide", () => {
        window.clearInterval(listTimer);
        window.clearInterval(saveTimer);
      }, { once: true });
    })();
