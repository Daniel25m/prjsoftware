# Kanban — Sprint 3

**Projeto:** PetLume — MVP de adoção responsável  
**Escopo da sprint:** três casos de uso simples, sem login, administração ou integrações externas.

| A fazer | Em andamento | Concluído |
| --- | --- | --- |
| Validar manualmente os três fluxos completos pela interface e conferir os dados salvos após reiniciar a API. | Finalizar o acesso do responsável às manifestações de interesse recebidas. A API já registra nome, e-mail e mensagem, mas ainda não há uma tela/rota para consultá-los. | Repositório organizado com front-end React/Vite e API FastAPI. |
| Preparar a demonstração com anúncios de exemplo e roteiro dos casos de uso. | — | Banco SQLite configurado; criação das tabelas e carga opcional de exemplos funcionando. |
| Registrar evidências da demonstração e atualizar este quadro ao concluir as tarefas. | — | **UC 1:** publicar anúncio de pet com os dados do responsável. |
|  |  | **UC 2:** listar, visualizar e filtrar pets por espécie, porte e cidade. |
|  |  | **UC 3 (parcial):** registrar interesse com nome, e-mail e mensagem; pet fica indisponível na busca. |
|  |  | Testes automatizados da API; lint e build do front-end aprovados. |

## Critérios para concluir a sprint

- O responsável pelo anúncio consegue consultar os dados do interesse recebido.
- Os três fluxos são demonstrados pela interface usando o SQLite.
- Após reiniciar a API, os anúncios e interesses continuam persistidos.
- O roteiro e este quadro refletem o estado final apresentado.

## Roteiro da demonstração

1. Publicar um anúncio com os dados do pet e do responsável.
2. Encontrar o anúncio e testar filtros de espécie, porte e cidade.
3. Enviar interesse com nome, e-mail e mensagem.
4. Mostrar ao responsável os dados recebidos e confirmar que o pet não aparece mais entre os disponíveis.

## Fora do escopo desta sprint

Login e cadastro de contas, painel administrativo, aprovação/recusa de pedidos, notificações por e-mail, marketplace, eventos, campanhas e feed da comunidade.
