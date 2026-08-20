const SYSTEM_PROMPT = `
Você é a IA de apoio analítico do aplicativo Inova.

OBJETIVO
Ajudar o usuário a interpretar gráficos, movimentações simuladas, lembretes empresariais,
fluxo de caixa e cotações exibidas pelo aplicativo.

REGRAS
- Seja neutra, explicável e não manipulativa.
- Diferencie fato observado, inferência e hipótese.
- Não pressione o usuário a investir, comprar, vender, contrair crédito ou transferir dinheiro.
- Não prometa lucro, retorno ou segurança financeira.
- Ao falar de risco, apresente incertezas e alternativas.
- Não execute transações. Apenas analise informações fornecidas.
- Quando os dados forem insuficientes, diga exatamente o que está faltando.
- Para decisões relevantes, sugira critérios objetivos e cenários, não uma ordem.
- Considere que todos os valores bancários deste protótipo são simulados.
- Responda em português do Brasil.
- Use linguagem simples, direta e fácil de entender.
- Comece pela conclusão ou pelo ponto mais importante.
- Evite jargões; quando um termo técnico for necessário, explique-o em uma frase curta.
- Prefira respostas curtas, com no máximo 3 a 6 pontos quando uma lista ajudar.
- Não despeje números sem contexto: diga o que eles significam.
- Se o usuário perguntar "por quê?", explique a causa em passos simples.
- Mantenha o tom de um chatbot útil e natural, sem parecer um relatório burocrático.
`;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Use POST." }), {
        status: 405,
        headers: corsHeaders(),
      });
    }

    if (!env.GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: "Secret GROQ_API_KEY não configurado." }), {
        status: 500,
        headers: corsHeaders(),
      });
    }

    if (!env.GROQ_MODEL) {
      return new Response(JSON.stringify({ error: "Variável GROQ_MODEL não configurada." }), {
        status: 500,
        headers: corsHeaders(),
      });
    }

    try {
      const body = await request.json();
      const question = String(body.question || "").trim();
      const context = body.context || {};
      const history = Array.isArray(body.history) ? body.history.slice(-12) : [];

      if (!question) {
        return new Response(JSON.stringify({ error: "Pergunta vazia." }), {
          status: 400,
          headers: corsHeaders(),
        });
      }

      const safeHistory = history
        .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }));

      const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          temperature: 0.25,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "system",
              content: `Dados atuais do aplicativo (use apenas quando forem relevantes):\n${JSON.stringify(context, null, 2)}`,
            },
            ...safeHistory,
            { role: "user", content: question },
          ],
        }),
      });

      const data = await groqResponse.json();

      if (!groqResponse.ok) {
        return new Response(JSON.stringify({
          error: data?.error?.message || "Erro ao consultar a Groq.",
        }), {
          status: groqResponse.status,
          headers: corsHeaders(),
        });
      }

      const answer = data?.choices?.[0]?.message?.content || "Sem resposta.";
      return new Response(JSON.stringify({ answer }), {
        status: 200,
        headers: corsHeaders(),
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error?.message || error) }), {
        status: 500,
        headers: corsHeaders(),
      });
    }
  },
};
