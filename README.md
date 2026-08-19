# Inova Bank — protótipo bancário local

Aplicativo Android baseado em WebView, com interface em HTML/CSS/JS e funcionamento local.

## Estado do projeto

O projeto já está aplicado neste repositório. O workflow **Build Android APK** pode ser executado em **Actions** para validar a interface e gerar o APK de debug.

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

1. Abra a aba **Actions** do repositório.
2. Abra **Build Android APK**.
3. Execute **Run workflow** na branch `main`.
4. Aguarde a conclusão do job `build`.
5. Baixe o artefato `InovaBank-debug-apk`.

O APK gerado é de debug, adequado para prototipagem e testes.

## IA com Cloudflare + Groq

A pasta `cloudflare-worker/` contém o proxy.

### Configuração

1. Crie um Cloudflare Worker.
2. Use `cloudflare-worker/worker.js`.
3. Crie o Secret `GROQ_API_KEY`.
4. Crie a variável `GROQ_MODEL` usando um modelo disponível na sua conta Groq.
5. Publique o Worker.
6. No aplicativo, vá em **Perfil > IA via Cloudflare** e informe a URL HTTPS do Worker.

A chave da Groq não deve ser colocada no HTML, no GitHub ou no APK.

## Cotações

O protótipo consulta o endpoint público da AwesomeAPI para pares em BRL. A disponibilidade e frequência de atualização dependem do serviço externo.

## Interface

O Android abre `app/src/main/assets/index.html`. A interface original do ZIP é reconstruída localmente a partir dos arquivos em `app/src/main/assets/parts/`, permitindo preservar o conteúdo integral do HTML no repositório.
