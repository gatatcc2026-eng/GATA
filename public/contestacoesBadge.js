import ApiService from "./ApiService.js";

console.log("✅ contestacoesBadge.js carregado");

const ALVOS = [
    { seletor: "#btnContestacoes", menu: false },
    { seletor: "#btnVerContestacoes", menu: false },
    { seletor: "#btnLancarNotas", menu: true },
    { seletor: "#btnLecionar", menu: true }
];

const INTERVALO_MS = 30000;

const token = sessionStorage.getItem("token");

const professor = JSON.parse(
    sessionStorage.getItem("dadosProfessor") || "null"
);

let total = 0;

function injetarEstilo() {

    if (document.getElementById("estiloBadgeContestacoes")) return;

    const estilo = document.createElement("style");

    estilo.id = "estiloBadgeContestacoes";

    estilo.textContent = `
        .badge-contestacoes {
            display: none;
            align-items: center;
            justify-content: center;
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            margin-left: 8px;
            border-radius: 999px;
            background: #dc2626;
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            line-height: 1;
            vertical-align: middle;
        }
    `;

    document.head.appendChild(estilo);
}

function garantirBadge(botao, menu) {

    let badge = botao.querySelector(":scope > .badge-contestacoes-js");

    if (!badge) {

        badge = document.createElement("span");

        /* nos menus laterais usa o mesmo estilo dos badges de solicitações */
        badge.className =
            "badge-contestacoes-js " + (menu ? "badge-menu" : "badge-contestacoes");

        badge.title = "Contestações de notas aguardando resposta";

        botao.appendChild(badge);
    }

    return badge;
}

function aplicar() {

    const texto = total > 99 ? "99+" : String(total);

    ALVOS.forEach(({ seletor, menu }) => {

        const botao = document.querySelector(seletor);

        if (!botao) return;

        const badge = garantirBadge(botao, menu);

        /* só mexe no DOM se mudou (evita loop com o MutationObserver) */
        if (badge.textContent !== texto) {
            badge.textContent = texto;
        }

        const exibir = total > 0 ? (menu ? "inline-block" : "inline-flex") : "none";

        if (badge.style.display !== exibir) {
            badge.style.display = exibir;
        }
    });
}

async function atualizar(api) {

    if (document.hidden) return;

    try {

        const resposta = await api.get(
            `/api/v1/contestacoes/professor/${encodeURIComponent(professor.registro)}/pendentes`
        );

        total = Number(resposta?.total) || 0;

    } catch (erro) {

        /* falha ao consultar o ícone não deve incomodar o usuário */
    }

    aplicar();
}

function iniciar() {

    injetarEstilo();

    const api = new ApiService(token);

    atualizar(api);

    setInterval(() => atualizar(api), INTERVALO_MS);

    document.addEventListener("visibilitychange", () => atualizar(api));

    /* depois de responder uma contestação o número cai */
    document.addEventListener("click", evento => {

        if (evento.target.closest("#btnEnviarRespostaContestacao")) {
            setTimeout(() => atualizar(api), 1500);
        }
    }, true);

    /* o botão "Contestações" da tela Lançar Notas é criado depois;
       quando ele aparecer, recebe o número também */
    let agendado = false;

    new MutationObserver(() => {

        if (agendado) return;

        agendado = true;

        requestAnimationFrame(() => {
            agendado = false;
            aplicar();
        });

    }).observe(document.body, { childList: true, subtree: true });
}

if (token && professor?.registro) {

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar);
    } else {
        iniciar();
    }
}