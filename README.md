# Inova Bank — protótipo bancário local

Aplicativo Android baseado em WebView, com interface em HTML/CSS/JS e funcionamento local.

## O que está incluído

- Tema preto/branco com alternância no canto superior direito.
- Saldo virtual, extrato e operações simuladas.
- Pix, código de barras, QR Code, recarga, débito automático e agendamentos simulados.
- Investimento virtual.
- Inova Empresa:
  - cadastro de nome social, CNPJ, matriz, filiais e observações;
  - gráficos de ganhos, despesas e média em 24h;
  - painel de 4 lembretes priorizados;
  - classificação por criticidade, valor, prazo e setor;
  - painel de moedas com consulta online.
- IA via Cloudflare Worker + Groq, sem expor a chave no aplicativo.
- PIN local opcional.
- Dados persistidos no `localStorage` do WebView.

> Importante: o projeto não guarda nem movimenta dinheiro real. Ele também não substitui controles de segurança, compliance, KYC, antifraude, PCI DSS ou infraestrutura de um banco real.

## Gerar APK pelo GitHub

1. Crie um repositório no GitHub.
2. Envie todos os arquivos deste ZIP para o repositório.
3. Abra a aba **Actions**.
4. Execute o workflow **Build Android APK** ou faça um push para `main`.
5. Ao final, baixe o artefato `InovaBank-debug-apk`.

O APK gerado será de debug, ideal para prototipagem e testes.

## IA com Cloudflare + Groq

A pasta `cloudflare-worker/` contém o proxy.

### Configuração

1. Crie um Cloudflare Worker.
2. Use `cloudflare-worker/worker.js`.
3. Crie o Secret:
   - `GROQ_API_KEY`
4. Crie também a variável:
   - `GROQ_MODEL`
   - use um modelo disponível na sua conta Groq.
5. Publique o Worker.
6. No aplicativo, vá em **Perfil > IA via Cloudflare** e informe a URL HTTPS do Worker.

A chave da Groq não deve ser colocada no HTML, no GitHub ou no APK.

## Cotações

O protótipo consulta o endpoint público da AwesomeAPI para pares em BRL. A disponibilidade e frequência de atualização dependem do serviço externo.

## Arquivo principal da interface

`app/src/main/assets/index.html`

Todo o CSS e JavaScript da interface está incorporado nesse único HTML.
