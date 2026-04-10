import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Backup Observability Gateway",
  description: "Documentacao do gateway de observabilidade para plataformas de backup.",
  base: process.env.DOCS_BASE_PATH ?? "/",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Inicio", link: "/" },
      { text: "Arquitetura", link: "/architecture" },
      { text: "CI/CD", link: "/cicd" },
      { text: "Rotas", link: "/routes" },
      { text: "Postman", link: "/postman" },
      { text: "Execucao", link: "/running" },
      { text: "Agente IA (MCP)", link: "/ai-agent-mcp-veeam-falhas" }
    ],
    sidebar: [
      {
        text: "Projeto",
        items: [
          { text: "Visao geral", link: "/" },
          { text: "Arquitetura", link: "/architecture" },
          { text: "CI/CD e branches", link: "/cicd" },
          { text: "Fluxos", link: "/flows" },
          { text: "Rotas e metricas", link: "/routes" },
          { text: "Documentacao Postman", link: "/postman" },
          { text: "Execucao", link: "/running" },
          { text: "Agente IA para falhas", link: "/ai-agent-mcp-veeam-falhas" }
        ]
      }
    ],
    search: {
      provider: "local"
    }
  }
});
