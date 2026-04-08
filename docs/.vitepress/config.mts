import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Veeam ONE Exporter",
  description: "Documentacao do exporter Fastify para Veeam ONE, Prometheus e Grafana.",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Inicio", link: "/" },
      { text: "Arquitetura", link: "/architecture" },
      { text: "Rotas", link: "/routes" },
      { text: "Postman", link: "/postman" },
      { text: "Execucao", link: "/running" }
    ],
    sidebar: [
      {
        text: "Projeto",
        items: [
          { text: "Visao geral", link: "/" },
          { text: "Arquitetura", link: "/architecture" },
          { text: "Fluxos", link: "/flows" },
          { text: "Rotas e metricas", link: "/routes" },
          { text: "Documentacao Postman", link: "/postman" },
          { text: "Execucao", link: "/running" }
        ]
      }
    ],
    search: {
      provider: "local"
    }
  }
});
