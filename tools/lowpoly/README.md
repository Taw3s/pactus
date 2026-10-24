# Sprites low poly

Modelos 3D procedurais (three.js) de todos os sprites em `public/lowpoly`. São exportados como PNG 48×48 com fundo transparente, sempre com a mesma câmera, luz e enquadramento.

```bash
cd tools/lowpoly
npm install
npx playwright install chromium   # ou: export CHROMIUM_PATH=/caminho/do/chrome
npm run render                    # todos os sprites
node render.mjs judge-            # só os quadros do juiz
```

- `models.js`: um modelo por sprite. O juiz é um modelo só (`judgeScene`), com uma pose por quadro em `JUDGE_FRAMES`. Cabeça, sobrancelhas, braços, martelo, lupa, carimbo e papel são peças separadas.
- A sequência e o tempo de cada animação ficam em `src/lib/judge.ts`. Um quadro novo precisa entrar nos dois arquivos.
- Os sprites aparecem no app em escala inteira (48, 96 ou 144 px), com `image-rendering: pixelated`.
