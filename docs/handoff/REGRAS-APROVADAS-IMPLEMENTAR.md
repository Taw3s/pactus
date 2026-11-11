# Regras aprovadas para implementar

O responsável confirmou estas regras em 10/11/2026. A IA deve implementá-las no checkout oficial `Taw3s/pactus`, branch atualizado, mantendo UI, API, banco, documentação e testes alinhados.

## Digitação anulada

1. **Refazer sempre exige um teste novo.** Depois da anulação final, a prova substituta deve usar um teste iniciado e terminado depois do veredito. Não reutilizar testes mais antigos, mesmo que estejam sem uso.
2. **Tentativa especial após as três tentativas normais.** Quando as três tentativas do dia já tiverem sido consumidas e o tribunal anular a prova, liberar uma tentativa especial chamada “Nova tentativa”. Ela é única, separada da cota normal e só fica disponível depois do veredito final. Se a prova especial for contestada e o tribunal confirmar a anulação, registrar uma punição de uma Coca adicional à dívida normal do dia. Uma contestação rejeitada não gera punição.
3. **Congelar a prova enviada.** A prova e o material mostrado ao tribunal ficam vinculados ao teste escolhido no envio. Um resultado melhor feito depois não altera retroativamente a prova, a tela de prova ou a evidência do tribunal. Uma nova prova após anulação usa a regra 1.

## Desafio semanal

4. **Saída durante a semana.** Quem estava no grupo na segunda e sai ou é removido deixa de bloquear o baú semanal dos demais. Quem entra depois de segunda participa do desafio semanal seguinte. Ajustar o guia do produto para refletir essa regra.

## Critérios técnicos

- A elegibilidade, o contador da tentativa especial e a penalidade são decididos no servidor/banco, em operação atômica e protegida contra replay e concorrência. A interface só apresenta o estado retornado pelo servidor.
- Guardar o teste associado ao check-in e usar esse mesmo teste para a exibição e revisão da prova; não consultar o “melhor teste do dia” para reescrever uma prova já enviada.
- Atualizar o teste diferencial já presente no `main` para refletir as regras aprovadas. Preservar a trilha de auditoria e remover expectativas antigas somente depois de um caso de regressão passar.
- A Coca adicional é uma dívida de item pelo fluxo existente do grupo; não substitui as consequências normais do dia.

## Ainda necessário para publicar

As regras de produto acima estão decididas, mas ainda precisam ser implementadas e validadas no repositório oficial. Permanecem também os gates de staging, revisão legal, CI, testes em celular e verificação de YouTube/Firefox descritos em `PREFLIGHT-DEPLOY.md`.
