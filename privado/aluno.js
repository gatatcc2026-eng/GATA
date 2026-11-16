import ApiService from "./ApiService.js";

console.log("✅ aluno.js carregado (trava de contestação)");

/* =========================================================
   DADOS INICIAIS
========================================================= */

const token = sessionStorage.getItem("token");

const alunoObj = JSON.parse(
    sessionStorage.getItem("dadosAluno") || "null"
);

let _porBimestre = {};
let _contestacoes = [];

/* ids das disciplinas do aluno cujo curso está com as notas fechadas */
let _disciplinasTravadas = new Set();

if (!token || !alunoObj) {
    sessionStorage.clear();
    window.location.replace("paginaLogin.html");
    throw new Error("Sessão inexistente. Redirecionando para o login.");
}

const api = new ApiService(token);

/* =========================================================
   STATUS VÁLIDOS DAS CONTESTAÇÕES
   Em análise | Alterado | Recusada
========================================================= */

const STATUS_EM_ANALISE = "Em análise";
const STATUS_ALTERADO = "Alterado";
const STATUS_RECUSADA = "Recusada";

const MSG_NOTAS_FECHADAS =
    "As notas desta disciplina foram fechadas pelo coordenador do curso. " +
    "Não é possível contestar no momento.";

/* =========================================================
   TURMA DO ALUNO LOGADO
========================================================= */

function obterIdTurmaAluno() {
    return (
        alunoObj.Turma_idTurma ??
        alunoObj.turma ??
        alunoObj.idTurma ??
        null
    );
}

/* =========================================================
   NORMALIZAR BIMESTRE
========================================================= */

function normalizarBimestre(b) {

    if (!b && b !== 0) {
        return "Sem bimestre";
    }

    const s = String(b).trim();

    if (/^\dº Bimestre$/i.test(s)) {
        return s;
    }

    const n = parseInt(s.charAt(0));

    if (n >= 1 && n <= 4) {
        return `${n}º Bimestre`;
    }

    return s || "Sem bimestre";
}

/* =========================================================
   NORMALIZAR STATUS
   Converte qualquer valor da API (inclusive antigos)
   para um dos 3 status válidos.
========================================================= */

function normalizarStatusContestacao(status) {

    if (status === null || status === undefined || status === "") {
        return STATUS_EM_ANALISE;
    }

    const s = String(status).trim().toLowerCase();

    if (["em análise", "em analise", "análise", "analise", "pendente", "pending"].includes(s)) {
        return STATUS_EM_ANALISE;
    }

    if (["alterado", "alterada", "alterar", "aceita", "aceito", "aprovada", "aprovado", "approved"].includes(s)) {
        return STATUS_ALTERADO;
    }

    if (["recusada", "recusado", "rejeitada", "rejeitado", "denied", "rejected"].includes(s)) {
        return STATUS_RECUSADA;
    }

    return STATUS_EM_ANALISE;
}

/* =========================================================
   FORMATAR NOTA (valor vindo da API -> "8.5" ou "—")
========================================================= */

function formatarNotaContestacao(valor) {

    if (valor === null || valor === undefined || valor === "") {
        return "—";
    }

    const numero = Number(valor);

    return Number.isNaN(numero) ? "—" : numero.toFixed(1);
}

/* =========================================================
   ESCAPAR HTML
========================================================= */

function escapeHtml(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/'/g, "&#39;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function escapeHtmlAttribute(text) {
    return escapeHtml(text);
}

/* =========================================================
   TRAVA DE CONTESTAÇÃO (NOTAS FECHADAS PELO COORDENADOR)

   O servidor devolve os ids das disciplinas do aluno cujo
   curso está com as notas fechadas. Nelas o botão "Contestar"
   some e aparece o aviso. O servidor também recusa o envio
   (403), então a trava vale mesmo sem o front.
========================================================= */

async function carregarTrava() {

    try {

        const matricula = String(alunoObj.matricula || "").trim();

        if (!matricula) {
            return;
        }

        const resposta = await api.get(
            `/api/v1/contestacoes/aluno/${encodeURIComponent(matricula)}/trava`
        );

        const ids = Array.isArray(resposta?.disciplinasTravadas)
            ? resposta.disciplinasTravadas
            : [];

        _disciplinasTravadas = new Set(ids.map(id => String(id)));

    } catch (erro) {

        console.error("Erro ao consultar a trava de contestação:", erro);

        _disciplinasTravadas = new Set();
    }

    atualizarAvisoTrava();
}

function disciplinaTravada(idDisciplina) {
    return _disciplinasTravadas.has(String(idDisciplina));
}

function atualizarAvisoTrava() {

    const container = document.getElementById("notasContainer");

    if (!container || !container.parentNode) {
        return;
    }

    let aviso = document.getElementById("avisoTrava");

    if (_disciplinasTravadas.size === 0) {

        if (aviso) {
            aviso.remove();
        }

        return;
    }

    if (!aviso) {

        aviso = document.createElement("div");

        aviso.id = "avisoTrava";
        aviso.className = "contestacao-aviso-pendente";
        aviso.style.margin = "0 0 18px";

        container.parentNode.insertBefore(aviso, container);
    }

    aviso.textContent =
        "🔒 O coordenador do curso fechou o lançamento de notas em uma ou mais " +
        "disciplinas. Nelas, não é possível contestar enquanto as notas estiverem fechadas.";
}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function inicializar() {

    document.getElementById("infoNome").textContent = alunoObj.nome || "—";
    document.getElementById("infoMatricula").textContent = alunoObj.matricula || "—";

    const turmaId = obterIdTurmaAluno();

    try {

        if (turmaId) {

            const turma = await api.getById("/api/v1/turmas", turmaId);

            document.getElementById("infoTurma").textContent =
                turma?.nomeTurma || "—";

        } else {

            document.getElementById("infoTurma").textContent = "—";
        }

    } catch (e) {

        console.error("Erro ao carregar turma do aluno:", e);

        document.getElementById("infoTurma").textContent = "—";
    }

    await carregarTrava();

    await carregarNotas();

    await carregarContestacoes();
}

/* =========================================================
   CARREGAR NOTAS
========================================================= */

async function carregarNotas(filtro = "todos") {

    const container = document.getElementById("notasContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "<p class='msg-info'>Carregando...</p>";

    try {

        const matricula = String(alunoObj.matricula || "").trim();

        if (!matricula) {
            container.innerHTML =
                "<p class='msg-erro'>Matrícula do aluno não encontrada.</p>";
            return;
        }

        /*
         * Os professores vêm de uma rota própria do aluno
         * (só id da disciplina, registro e nome), porque a rota
         * /api/v1/professores é restrita a professores (403).
         */

        const [
            respostaRelacoes,
            respostaNotas,
            respostaDisciplinas,
            respostaProfessores
        ] = await Promise.all([
            api.get("/api/v1/aluno-disciplina-professor"),
            api.get("/api/v1/notas"),
            api.get("/api/v1/disciplinas"),
            api.get(
                `/api/v1/alunos/${encodeURIComponent(matricula)}/professores`
            ).catch(() => [])
        ]);

        const paraArray = (resposta, ...chaves) => {

            if (Array.isArray(resposta)) {
                return resposta;
            }

            for (const chave of chaves) {
                if (Array.isArray(resposta?.[chave])) {
                    return resposta[chave];
                }
            }

            return [];
        };

        const todasRelacoes = paraArray(respostaRelacoes, "data", "alunos");
        const todasNotas = paraArray(respostaNotas, "data", "notas");
        const todasDisciplinas = paraArray(respostaDisciplinas, "data", "disciplinas");
        const professoresDasDisciplinas = paraArray(respostaProfessores, "data", "professores");

        /* ---------- RELAÇÕES DO ALUNO ---------- */

        const relacoes = todasRelacoes.filter(r => {

            const matriculaRelacao =
                r.Aluno_matricula ??
                r.aluno?.matricula ??
                r.aluno?.Matricula ??
                r.matricula;

            return String(matriculaRelacao ?? "").trim() === matricula;
        });

        if (relacoes.length === 0) {
            container.innerHTML =
                "<p class='msg-info'>Nenhuma disciplina encontrada.</p>";
            _porBimestre = {};
            return;
        }

        /* ---------- MAPA DE PROFESSORES POR DISCIPLINA ---------- */

        const mapaProfessorPorDisciplina = {};

        professoresDasDisciplinas.forEach(p => {

            const idDisciplina = String(p.idDisciplina);

            const nome = p.nome || `Professor ${p.registro}`;

            if (!mapaProfessorPorDisciplina[idDisciplina]) {
                mapaProfessorPorDisciplina[idDisciplina] = [];
            }

            if (!mapaProfessorPorDisciplina[idDisciplina].includes(nome)) {
                mapaProfessorPorDisciplina[idDisciplina].push(nome);
            }
        });

        /* ---------- MAPA DE DISCIPLINAS ---------- */

        const mapaDisciplinas = {};

        todasDisciplinas.forEach(d => {

            const id = d.idDisciplina ?? d.id ?? d.Disciplina_idDisciplina;
            const nome = d.nomeDisciplina ?? d.nome ?? d.nome_disciplina;

            const professorNome =
                (mapaProfessorPorDisciplina[String(id)] || []).join(", ") || "—";

            if (id != null) {
                mapaDisciplinas[String(id)] = {
                    nome: nome || `Disciplina ${id}`,
                    professorNome
                };
            }
        });

        /* ---------- IDs DAS RELAÇÕES ---------- */

        const idsAdp = new Set(
            relacoes
                .map(r => r.idAlunoDisciplinaProfessor ?? r.id ?? r.ID)
                .filter(id => id != null)
                .map(id => String(id))
        );

        /* ---------- NOTAS DO ALUNO ---------- */

        const notasAluno = todasNotas.filter(n => {

            const idNota =
                n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor ??
                n.alunoDisciplinaProfessor?.idAlunoDisciplinaProfessor ??
                n.AlunoDisciplinaProfessor?.idAlunoDisciplinaProfessor ??
                n.idAlunoDisciplinaProfessor;

            return idsAdp.has(String(idNota));
        });

        if (notasAluno.length === 0) {
            container.innerHTML =
                "<p class='msg-info'>Nenhuma nota lançada ainda.</p>";
            _porBimestre = {};
            return;
        }

        /* ---------- ENRIQUECER NOTAS ---------- */

        const notasEnriquecidas = notasAluno.map(n => {

            const idAdp =
                n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor ??
                n.alunoDisciplinaProfessor?.idAlunoDisciplinaProfessor ??
                n.AlunoDisciplinaProfessor?.idAlunoDisciplinaProfessor ??
                n.idAlunoDisciplinaProfessor;

            const rel = relacoes.find(r => {
                const idRelacao = r.idAlunoDisciplinaProfessor ?? r.id ?? r.ID;
                return String(idRelacao) === String(idAdp);
            });

            const idDisciplina = rel
                ? (
                    rel.Disciplina_idDisciplina ??
                    rel.disciplina?.idDisciplina ??
                    rel.disciplina?.id ??
                    rel.Disciplina?.idDisciplina
                )
                : (
                    n.Disciplina_idDisciplina ??
                    n.idDisciplina ??
                    null
                );

            const infoDisciplina = mapaDisciplinas[String(idDisciplina)] ?? null;

            const nomeDisciplina =
                rel?.disciplina?.nomeDisciplina ??
                rel?.disciplina?.nome ??
                rel?.Disciplina?.nomeDisciplina ??
                infoDisciplina?.nome ??
                (idDisciplina != null ? `Disciplina ${idDisciplina}` : "—");

            return {
                ...n,
                idDisciplina,
                idAlunoDisciplinaProfessor: idAdp,
                bimestre: normalizarBimestre(n.bimestre ?? n.Bimestre ?? n.periodo),
                nomeDisciplina,
                professor: infoDisciplina?.professorNome ?? "—",
                nota: n.nota ?? n.Nota ?? null
            };
        });

        /* ---------- ORGANIZAR POR BIMESTRE ---------- */

        const porBimestre = {};

        notasEnriquecidas.forEach(n => {

            const bimestre = n.bimestre;

            if (!porBimestre[bimestre]) {
                porBimestre[bimestre] = [];
            }

            porBimestre[bimestre].push(n);
        });

        _porBimestre = porBimestre;

        renderizarNotas(filtro);

    } catch (erro) {

        console.error("Erro ao carregar notas:", erro);

        container.innerHTML = "<p class='msg-erro'>Erro ao carregar notas.</p>";
    }
}

/* =========================================================
   PEGAR CONTESTAÇÃO MAIS RECENTE
========================================================= */

function obterContestacao(idDisciplina, bimestre) {

    if (!Array.isArray(_contestacoes) || _contestacoes.length === 0) {
        return null;
    }

    const bimestreNormalizado = normalizarBimestre(bimestre);

    const encontradas = _contestacoes.filter(contestacao => {

        const idContestacaoDisciplina =
            contestacao.idDisciplina ??
            contestacao.Disciplina_idDisciplina ??
            contestacao.disciplina?.idDisciplina ??
            contestacao.disciplina?.id;

        const bimestreContestacao = normalizarBimestre(
            contestacao.bimestre ?? contestacao.Bimestre ?? contestacao.periodo
        );

        return (
            String(idContestacaoDisciplina) === String(idDisciplina) &&
            bimestreContestacao === bimestreNormalizado
        );
    });

    if (encontradas.length === 0) {
        return null;
    }

    /* A maior ID representa a contestação mais recente. */

    encontradas.sort((a, b) => {
        const idA = Number(a.idContestacao ?? a.id ?? 0);
        const idB = Number(b.idContestacao ?? b.id ?? 0);
        return idB - idA;
    });

    return encontradas[0];
}

/* =========================================================
   EXISTE CONTESTAÇÃO EM ANÁLISE
========================================================= */

function existeContestacaoPendente(idDisciplina, bimestre) {

    return _contestacoes.some(contestacao => {

        const disciplinaContestacao =
            contestacao.idDisciplina ??
            contestacao.Disciplina_idDisciplina ??
            contestacao.disciplina?.idDisciplina ??
            contestacao.disciplina?.id;

        const bimestreContestacao = normalizarBimestre(
            contestacao.bimestre ?? contestacao.Bimestre ?? contestacao.periodo
        );

        const status = normalizarStatusContestacao(contestacao.status);

        return (
            String(disciplinaContestacao) === String(idDisciplina) &&
            bimestreContestacao === normalizarBimestre(bimestre) &&
            status === STATUS_EM_ANALISE
        );
    });
}

/* =========================================================
   RENDERIZAR NOTAS
========================================================= */

function renderizarNotas(filtro = "todos") {

    const container = document.getElementById("notasContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const bimestres = Object.keys(_porBimestre).sort(
        (a, b) => parseInt(a.charAt(0)) - parseInt(b.charAt(0))
    );

    if (bimestres.length === 0) {
        container.innerHTML =
            "<p class='msg-info'>Nenhuma nota lançada ainda.</p>";
        return;
    }

    let encontrou = false;

    bimestres.forEach(bimestre => {

        if (filtro !== "todos" && filtro !== bimestre) {
            return;
        }

        encontrou = true;

        const lista = _porBimestre[bimestre];

        const media = (
            lista.reduce((s, n) => s + (Number(n.nota) || 0), 0) / lista.length
        ).toFixed(1);

        const mediaNum = parseFloat(media);

        let html = `

            <div class="bimestre">

                <h2>${escapeHtml(bimestre)}</h2>

                <div class="tabela-wrapper">

                    <table class="tabela-notas">

                        <thead>
                            <tr>
                                <th>Disciplina</th>
                                <th>Nota</th>
                                <th>Contestação</th>
                            </tr>
                        </thead>

                        <tbody>
        `;

        lista.forEach(item => {

            const cls = Number(item.nota) >= 6 ? "nota-azul" : "nota-vermelha";

            const notaFormatada =
                item.nota != null ? Number(item.nota).toFixed(1) : "—";

            const contestacao = obterContestacao(item.idDisciplina, bimestre);

            let botaoContestacao = "";

            if (!contestacao) {

                /* NÃO EXISTE CONTESTAÇÃO */

                if (disciplinaTravada(item.idDisciplina)) {

                    /* NOTAS FECHADAS PELO COORDENADOR: NÃO PODE CONTESTAR */

                    botaoContestacao = `
                        <span
                            class="status-contestacao status-recusada"
                            title="${escapeHtmlAttribute(MSG_NOTAS_FECHADAS)}"
                        >
                            Notas fechadas
                        </span>
                    `;

                } else {

                    botaoContestacao = `
                        <button
                            type="button"
                            class="btn-contestar"
                            onclick="contestarNota(
                                '${escapeHtmlAttribute(item.idDisciplina)}',
                                '${escapeHtmlAttribute(item.nomeDisciplina)}',
                                '${escapeHtmlAttribute(item.professor)}',
                                '${escapeHtmlAttribute(notaFormatada)}',
                                '${escapeHtmlAttribute(bimestre)}'
                            )"
                        >
                            Contestar
                        </button>
                    `;
                }

            } else {

                /* EM ANÁLISE / ALTERADO / RECUSADA */

                const status = normalizarStatusContestacao(contestacao.status);

                botaoContestacao = `
                    <span class="status-contestacao ${classeStatusContestacao(status)}">
                        ${escapeHtml(status)}
                    </span>
                `;
            }

            html += `
                <tr>
                    <td>${escapeHtml(item.nomeDisciplina)}</td>
                    <td class="${cls}">${escapeHtml(notaFormatada)}</td>
                    <td>${botaoContestacao}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>

                    </table>

                </div>

                <div class="${mediaNum >= 6 ? "media-azul" : "media-vermelha"} media-box">
                    Média do ${escapeHtml(bimestre)}: ${escapeHtml(media)}
                </div>

            </div>
        `;

        container.innerHTML += html;
    });

    if (!encontrou) {
        container.innerHTML =
            "<p class='msg-info'>Nenhuma nota para o bimestre selecionado.</p>";
    }

    /* o aviso fica fora do container; garante que continua no lugar */
    atualizarAvisoTrava();
}

/* =========================================================
   FILTRO
========================================================= */

function filtrarBimestre() {

    const filtro = document.getElementById("filtroBimestre")?.value || "todos";

    renderizarNotas(filtro);
}

/* =========================================================
   CONTESTAR NOTA
========================================================= */

function contestarNota(idDisciplina, disciplina, professor, nota, bimestre) {

    /* Notas fechadas pelo coordenador do curso: não contesta. */

    if (disciplinaTravada(idDisciplina)) {

        popupInfo(MSG_NOTAS_FECHADAS);

        return;
    }

    /* Somente uma contestação em análise bloqueia novo envio. */

    if (existeContestacaoPendente(idDisciplina, bimestre)) {

        popupInfo(
            "Você já possui uma contestação em análise para esta disciplina neste bimestre. " +
            "Aguarde a resposta do professor."
        );

        return;
    }

    abrirModalContestacao(idDisciplina, disciplina, professor, nota, bimestre);
}

/* =========================================================
   ABRIR MODAL
========================================================= */

function abrirModalContestacao(idDisciplina, disciplina, nomeProfessor, nota, bimestre) {

    const antigo = document.getElementById("modalContestacao");

    if (antigo) {
        antigo.remove();
    }

    const nomeExibido =
        nomeProfessor && typeof nomeProfessor === "object"
            ? (nomeProfessor.nome ?? nomeProfessor.nomeProfessor ?? "")
            : String(nomeProfessor ?? "").trim();

    const modal = document.createElement("div");

    modal.id = "modalContestacao";

    modal.innerHTML = `

        <div class="modal-contestacao-overlay">

            <div class="modal-contestacao" role="dialog" aria-modal="true">

                <button
                    type="button"
                    class="modal-contestacao-fechar"
                    onclick="fecharModalContestacao()"
                    aria-label="Fechar"
                >
                    ×
                </button>

                <div class="modal-contestacao-header">

                    <div class="modal-contestacao-icone">!</div>

                    <div>
                        <h2>Contestar nota</h2>
                        <p>Informe o motivo da sua contestação.</p>
                    </div>

                </div>

                <div class="contestacao-info">

                    <div>
                        <span>Disciplina</span>
                        <strong>${escapeHtml(disciplina)}</strong>
                    </div>

                    <div>
                        <span>Professor</span>
                        <strong>${escapeHtml(nomeExibido || "Não informado")}</strong>
                    </div>

                    <div>
                        <span>Nota</span>
                        <strong>${escapeHtml(nota)}</strong>
                    </div>

                    <div>
                        <span>Bimestre</span>
                        <strong>${escapeHtml(bimestre)}</strong>
                    </div>

                </div>

                <label for="motivoContestacao" class="label-contestacao">
                    Motivo da contestação
                </label>

                <textarea
                    id="motivoContestacao"
                    class="textarea-contestacao"
                    maxlength="1000"
                    placeholder="Explique detalhadamente o motivo da contestação..."
                ></textarea>

                <div class="contador-contestacao">
                    <span id="contadorCaracteres">0</span>/1000
                </div>

                <div id="erroContestacao" class="erro-contestacao"></div>

                <div class="modal-contestacao-acoes">

                    <button
                        type="button"
                        class="btn-cancelar-contestacao"
                        onclick="fecharModalContestacao()"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        id="btnEnviarContestacao"
                        class="btn-enviar-contestacao"
                        onclick="enviarContestacao(
                            '${escapeHtmlAttribute(idDisciplina)}',
                            '${escapeHtmlAttribute(disciplina)}',
                            '${escapeHtmlAttribute(nomeExibido)}',
                            '${escapeHtmlAttribute(nota)}',
                            '${escapeHtmlAttribute(bimestre)}'
                        )"
                    >
                        Enviar contestação
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    const textarea = document.getElementById("motivoContestacao");
    const contador = document.getElementById("contadorCaracteres");

    if (textarea && contador) {
        textarea.addEventListener("input", () => {
            contador.textContent = textarea.value.length;
        });
    }

    const overlay = modal.querySelector(".modal-contestacao-overlay");

    if (overlay) {
        overlay.addEventListener("click", event => {
            if (event.target === overlay) {
                fecharModalContestacao();
            }
        });
    }

    setTimeout(() => {
        if (textarea) {
            textarea.focus();
        }
    }, 100);
}

function fecharModalContestacao() {

    const modal = document.getElementById("modalContestacao");

    if (modal) {
        modal.remove();
    }
}

/* =========================================================
   ENVIAR CONTESTAÇÃO
========================================================= */

async function enviarContestacao(idDisciplina, disciplina, professor, nota, bimestre) {

    const textarea = document.getElementById("motivoContestacao");
    const erro = document.getElementById("erroContestacao");
    const botao = document.getElementById("btnEnviarContestacao");

    if (!textarea || !erro || !botao) {
        return;
    }

    const motivo = textarea.value.trim();

    erro.textContent = "";

    if (!motivo) {
        erro.textContent = "Informe o motivo da contestação.";
        textarea.focus();
        return;
    }

    if (motivo.length < 10) {
        erro.textContent = "Descreva o motivo com pelo menos 10 caracteres.";
        textarea.focus();
        return;
    }

    /* Notas fechadas enquanto o modal estava aberto. */

    if (disciplinaTravada(idDisciplina)) {
        erro.textContent = MSG_NOTAS_FECHADAS;
        return;
    }

    /* Verificação final antes do POST. */

    if (existeContestacaoPendente(idDisciplina, bimestre)) {
        erro.textContent =
            "Já existe uma contestação em análise para esta disciplina e bimestre.";
        return;
    }

    try {

        botao.disabled = true;
        botao.textContent = "Enviando...";

        const resposta = await api.post("/api/v1/contestacoes", {
            matricula: alunoObj.matricula,
            idDisciplina: Number(idDisciplina),
            bimestre: bimestre,
            motivo: motivo
        });

        console.log("Resposta da API:", resposta);

        if (!resposta || resposta.success === false) {
            throw new Error(
                resposta?.message ||
                resposta?.msg ||
                "Não foi possível enviar a contestação."
            );
        }

        fecharModalContestacao();

        await carregarContestacoes();

        atualizarBotoesContestacao();

        abrirModalSucesso(
            "Contestação enviada",
            "Sua contestação foi enviada com sucesso para o professor."
        );

    } catch (erroEnvio) {

        console.error("Erro ao enviar contestação:", erroEnvio);

        const mensagem = String(
            erroEnvio?.response?.error ||
            erroEnvio?.message ||
            ""
        );

        if (mensagem.toLowerCase().includes("fechadas")) {

            /* o coordenador fechou as notas depois que a página abriu */

            erro.textContent = MSG_NOTAS_FECHADAS;

            await carregarTrava();

            atualizarBotoesContestacao();

        } else if (
            mensagem.includes("409") ||
            mensagem.toLowerCase().includes("já existe") ||
            mensagem.toLowerCase().includes("pendente") ||
            mensagem.toLowerCase().includes("em análise")
        ) {

            erro.textContent =
                "Já existe uma contestação em análise para esta disciplina e bimestre.";

        } else {

            erro.textContent =
                mensagem || "Não foi possível enviar a contestação.";
        }

        botao.disabled = false;
        botao.textContent = "Enviar contestação";
    }
}

/* =========================================================
   MODAL DE SUCESSO
========================================================= */

function abrirModalSucesso(titulo, mensagem) {

    const antigo = document.getElementById("modalSucessoContestacao");

    if (antigo) {
        antigo.remove();
    }

    const modal = document.createElement("div");

    modal.id = "modalSucessoContestacao";
    modal.className = "modal-resposta-aluno-overlay";

    modal.innerHTML = `

        <div class="modal-resposta-aluno">

            <div class="modal-resposta-aluno-header">

                <div class="modal-resposta-aluno-icone">✓</div>

                <div>
                    <h2>${escapeHtml(titulo)}</h2>
                    <p>Contestação</p>
                </div>

            </div>

            <div class="modal-resposta-aluno-mensagem">
                <p>${escapeHtml(mensagem)}</p>
            </div>

            <div class="modal-resposta-aluno-footer">

                <button
                    type="button"
                    class="btn-fechar-resposta-aluno"
                    onclick="fecharModalSucesso()"
                >
                    Fechar
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", evento => {
        if (evento.target === modal) {
            fecharModalSucesso();
        }
    });
}

function fecharModalSucesso() {

    const modal = document.getElementById("modalSucessoContestacao");

    if (modal) {
        modal.remove();
    }
}

/* =========================================================
   CARREGAR CONTESTAÇÕES
========================================================= */

async function carregarContestacoes() {

    const container = document.getElementById("contestacoesContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "<p class='msg-info'>Carregando requisições...</p>";

    try {

        const matricula = String(alunoObj.matricula || "").trim();

        if (!matricula) {
            container.innerHTML =
                "<p class='msg-erro'>Matrícula do aluno não encontrada.</p>";
            return;
        }

        const resposta = await api.get(
            `/api/v1/contestacoes/aluno/${encodeURIComponent(matricula)}`
        );

        let contestacoes = [];

        if (Array.isArray(resposta)) {
            contestacoes = resposta;
        } else if (Array.isArray(resposta?.requisicoes)) {
            contestacoes = resposta.requisicoes;
        } else if (Array.isArray(resposta?.contestacoes)) {
            contestacoes = resposta.contestacoes;
        } else if (Array.isArray(resposta?.data)) {
            contestacoes = resposta.data;
        }

        _contestacoes = contestacoes;

        renderizarContestacoes();

        atualizarBotoesContestacao();

    } catch (erro) {

        console.error("Erro ao carregar contestações:", erro);

        _contestacoes = [];

        container.innerHTML = `
            <div class="sem-contestacoes">
                <strong>Não foi possível carregar as requisições.</strong>
                <span>Tente atualizar novamente.</span>
            </div>
        `;
    }
}

/* =========================================================
   CLASSE DO STATUS
   (reaproveita as classes CSS já existentes no HTML)
========================================================= */

function classeStatusContestacao(status) {

    switch (normalizarStatusContestacao(status)) {

        case STATUS_ALTERADO:
            return "status-aceita";

        case STATUS_RECUSADA:
            return "status-recusada";

        default:
            return "status-pendente";
    }
}

/* =========================================================
   BUSCAR NOTA DA CONTESTAÇÃO
   (fallback para contestações sem notaAnterior)
========================================================= */

function buscarNotaDaContestacao(idDisciplina, bimestre) {

    const bimestreNormalizado = normalizarBimestre(bimestre);

    const notasDoBimestre = _porBimestre[bimestreNormalizado] || [];

    const notaEncontrada = notasDoBimestre.find(
        item => String(item.idDisciplina) === String(idDisciplina)
    );

    if (
        notaEncontrada?.nota !== null &&
        notaEncontrada?.nota !== undefined &&
        notaEncontrada?.nota !== ""
    ) {
        return Number(notaEncontrada.nota).toFixed(1);
    }

    return "—";
}

/* =========================================================
   RENDERIZAR CONTESTAÇÕES
========================================================= */

function renderizarContestacoes() {

    const container = document.getElementById("contestacoesContainer");

    if (!container) {
        return;
    }

    if (!_contestacoes || !_contestacoes.length) {

        container.innerHTML = `
            <div class="sem-contestacoes">
                <strong>Nenhuma contestação encontrada.</strong>
                <span>Quando você contestar uma nota, ela aparecerá aqui.</span>
            </div>
        `;

        return;
    }

    container.innerHTML = _contestacoes.map(contestacao => {

        const disciplina =
            contestacao.nomeDisciplina ||
            contestacao.disciplina?.nomeDisciplina ||
            contestacao.disciplina?.nome ||
            (typeof contestacao.disciplina === "string" ? contestacao.disciplina : "—");

        const professor =
            contestacao.professorNome ||
            contestacao.nomeProfessor ||
            contestacao.professor?.nome ||
            "—";

        const idDisciplina =
            contestacao.idDisciplina ??
            contestacao.Disciplina_idDisciplina ??
            contestacao.disciplina?.idDisciplina ??
            contestacao.disciplina?.id;

        const bimestre = normalizarBimestre(
            contestacao.bimestre ?? contestacao.Bimestre ?? contestacao.periodo
        );

        const status = normalizarStatusContestacao(contestacao.status);

        /* Nota que foi contestada (a antiga). */
        let nota = formatarNotaContestacao(
            contestacao.notaAnterior ?? contestacao.notaOriginal ?? contestacao.nota
        );

        if (nota === "—") {
            nota = buscarNotaDaContestacao(idDisciplina, bimestre);
        }

        /* Nota que está valendo hoje (só aparece depois de alterada). */
        const notaAtual = formatarNotaContestacao(contestacao.notaAtual);

        const motivo = contestacao.motivo || "—";

        const resposta =
            contestacao.resposta ||
            contestacao.respostaProfessor ||
            contestacao.mensagemResposta ||
            contestacao.respostaProfessorTexto ||
            "";

        return `

            <div class="card-contestacao">

                <div class="contestacao-cabecalho">

                    <div class="contestacao-titulo">
                        <h3>${escapeHtml(disciplina)}</h3>
                        <span class="professor-contestacao">
                            Professor: ${escapeHtml(professor)}
                        </span>
                    </div>

                    <span class="status-contestacao ${classeStatusContestacao(status)}">
                        ${escapeHtml(status)}
                    </span>

                </div>

                <div class="contestacao-info">

                    <div class="info-contestacao">
                        <strong>Nota contestada</strong>
                        <span class="nota-contestacao">${escapeHtml(nota)}</span>
                    </div>

                    ${status === STATUS_ALTERADO ? `
                        <div class="info-contestacao">
                            <strong>Nota atual</strong>
                            <span class="nota-contestacao">${escapeHtml(notaAtual)}</span>
                        </div>
                    ` : ""}

                    <div class="info-contestacao">
                        <strong>Bimestre</strong>
                        <span>${escapeHtml(bimestre)}</span>
                    </div>

                </div>

                <div class="contestacao-motivo">
                    <strong>Motivo enviado</strong>
                    <p>${escapeHtml(motivo)}</p>
                </div>

                ${resposta ? `
                    <div class="contestacao-resposta">
                        <strong>Resposta do professor</strong>
                        <p>${escapeHtml(resposta)}</p>
                    </div>
                ` : ""}

                ${status === STATUS_EM_ANALISE ? `
                    <div class="contestacao-aviso-pendente">
                        Sua contestação está em análise e aguarda resposta do professor.
                    </div>
                ` : ""}

            </div>
        `;
    }).join("");
}

/* =========================================================
   VISUALIZAR CONTESTAÇÃO
========================================================= */

function visualizarContestacao(idContestacao) {

    const contestacao = _contestacoes.find(c => {
        const id = c.idContestacao ?? c.id;
        return String(id) === String(idContestacao);
    });

    if (!contestacao) {
        popupErro("Não foi possível encontrar os dados desta contestação.");
        return;
    }

    const resposta =
        contestacao.resposta ??
        contestacao.respostaProfessor ??
        contestacao.mensagemResposta ??
        "";

    if (!resposta) {
        popupInfo("Esta contestação ainda não possui uma resposta.");
        return;
    }

    const disciplina =
        contestacao.nomeDisciplina ??
        contestacao.disciplina?.nomeDisciplina ??
        contestacao.disciplina?.nome ??
        "—";

    const status = normalizarStatusContestacao(contestacao.status);

    const antigo = document.getElementById("modalRespostaAluno");

    if (antigo) {
        antigo.remove();
    }

    const modal = document.createElement("div");

    modal.id = "modalRespostaAluno";
    modal.className = "modal-resposta-aluno-overlay";

    modal.innerHTML = `

        <div class="modal-resposta-aluno" role="dialog" aria-modal="true">

            <button
                type="button"
                class="modal-resposta-aluno-fechar"
                onclick="fecharModalRespostaAluno()"
            >
                ×
            </button>

            <div class="modal-resposta-aluno-header">

                <div class="modal-resposta-aluno-icone ${status === STATUS_ALTERADO ? "" : "recusada"}">
                    ${status === STATUS_ALTERADO ? "✓" : "!"}
                </div>

                <div>
                    <h2>Resposta do professor</h2>
                    <p>
                        ${status === STATUS_ALTERADO
                            ? "Contestação: nota alterada"
                            : "Contestação recusada"}
                    </p>
                </div>

            </div>

            <div class="modal-resposta-aluno-info">
                <span>Disciplina</span>
                <strong>${escapeHtml(disciplina)}</strong>
            </div>

            <div class="modal-resposta-aluno-mensagem">
                <span>Resposta</span>
                <p>${escapeHtml(resposta)}</p>
            </div>

            <div class="modal-resposta-aluno-footer">

                <button
                    type="button"
                    class="btn-fechar-resposta-aluno"
                    onclick="fecharModalRespostaAluno()"
                >
                    Fechar
                </button>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", evento => {
        if (evento.target === modal) {
            fecharModalRespostaAluno();
        }
    });
}

function fecharModalRespostaAluno() {

    const modal = document.getElementById("modalRespostaAluno");

    if (modal) {
        modal.remove();
    }
}

/* =========================================================
   ATUALIZAR BOTÕES
========================================================= */

function atualizarBotoesContestacao() {

    const filtro = document.getElementById("filtroBimestre")?.value || "todos";

    renderizarNotas(filtro);
}

/* =========================================================
   BAIXAR PDF
========================================================= */

function baixarPDF() {

    const { jsPDF } = window.jspdf || {};

    if (!jsPDF) {
        popupErro("Não foi possível carregar o gerador de PDF.");
        return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const AZUL = [26, 58, 138];
    const AZUL_CLARO = [238, 242, 249];
    const AZUL_FAIXA = [16, 38, 94];
    const AZUL_APROVADO = [37, 99, 235];
    const VERMELHO = [220, 38, 38];
    const CINZA = [107, 114, 128];
    const CINZA_CLARO = [229, 231, 235];

    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;

    /* ---------- CABEÇALHO ---------- */

    doc.setFillColor(...AZUL);
    doc.rect(0, 0, pageW, 22, "F");

    doc.setFillColor(...AZUL_FAIXA);
    doc.rect(0, 22, pageW, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("Boletim Escolar", margin, 13);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(210, 220, 240);
    doc.text("GATA · Sistema Acadêmico · Univap", margin, 18.5);

    const dataHoje = new Date().toLocaleDateString("pt-BR");

    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Emitido em ${dataHoje}`, pageW - margin, 13, { align: "right" });

    /* ---------- CARTÃO DE IDENTIFICAÇÃO ---------- */

    let y = 30;

    const cardH = 16;

    doc.setFillColor(...AZUL_CLARO);
    doc.roundedRect(margin, y, pageW - margin * 2, cardH, 2, 2, "F");

    const colunaAluno = margin + 6;
    const colunaMatricula = margin + (pageW - margin * 2) * 0.55;
    const colunaTurma = margin + (pageW - margin * 2) * 0.8;

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CINZA);

    doc.text("ALUNO", colunaAluno, y + 6);
    doc.text("MATRÍCULA", colunaMatricula, y + 6);
    doc.text("TURMA", colunaTurma, y + 6);

    doc.setFontSize(11);
    doc.setTextColor(...AZUL);

    doc.text(document.getElementById("infoNome")?.textContent || "—", colunaAluno, y + 12);
    doc.text(document.getElementById("infoMatricula")?.textContent || "—", colunaMatricula, y + 12);
    doc.text(document.getElementById("infoTurma")?.textContent || "—", colunaTurma, y + 12);

    y += cardH + 8;

    /* ---------- TABELA ÚNICA ---------- */

    const bimestresOrdenados = Object.keys(_porBimestre).sort(
        (a, b) => parseInt(a.charAt(0)) - parseInt(b.charAt(0))
    );

    const disciplinasSet = new Set();

    bimestresOrdenados.forEach(bimestre => {
        _porBimestre[bimestre].forEach(item => {
            disciplinasSet.add(item.nomeDisciplina);
        });
    });

    const disciplinas = [...disciplinasSet].sort(
        (a, b) => String(a).localeCompare(String(b), "pt-BR")
    );

    function notaDaDisciplina(bimestre, disciplina) {

        const item = _porBimestre[bimestre]?.find(
            i => i.nomeDisciplina === disciplina
        );

        return item?.nota != null ? Number(item.nota) : null;
    }

    const cabecalhos = ["Disciplina", ...bimestresOrdenados];

    const linhas = disciplinas.map(disciplina => [
        disciplina,
        ...bimestresOrdenados.map(bimestre => {
            const nota = notaDaDisciplina(bimestre, disciplina);
            return nota !== null ? nota.toFixed(1) : "—";
        })
    ]);

    /* ---------- MÉDIA POR BIMESTRE ---------- */

    const linhaMedia = [
        "Média",
        ...bimestresOrdenados.map(bimestre => {

            const lista = _porBimestre[bimestre];

            return (
                lista.reduce((s, n) => s + (Number(n.nota) || 0), 0) / lista.length
            ).toFixed(1);
        })
    ];

    doc.autoTable({

        startY: y,

        margin: { left: margin, right: margin },

        head: [cabecalhos],

        body: linhas,

        foot: [linhaMedia],

        theme: "grid",

        styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 4,
            textColor: [55, 65, 81],
            lineColor: CINZA_CLARO,
            lineWidth: 0.2
        },

        headStyles: {
            fillColor: AZUL_CLARO,
            textColor: AZUL,
            fontStyle: "bold",
            fontSize: 8.5
        },

        footStyles: {
            fillColor: [255, 255, 255],
            textColor: AZUL,
            fontStyle: "bold",
            fontSize: 9,
            lineWidth: 0.3,
            lineColor: AZUL
        },

        columnStyles: {
            0: { cellWidth: 60, fontStyle: "bold" }
        },

        didParseCell(data) {

            if (
                data.column.index >= 1 &&
                (data.section === "body" || data.section === "foot")
            ) {

                const valor = data.cell.raw;

                if (valor !== "—") {

                    const numero = Number(String(valor).replace(",", "."));

                    data.cell.styles.halign = "center";

                    if (data.section === "body") {
                        data.cell.styles.fontStyle = "bold";
                    }

                    if (!isNaN(numero)) {
                        data.cell.styles.textColor =
                            numero >= 6 ? AZUL_APROVADO : VERMELHO;
                    }
                }
            }
        },

        alternateRowStyles: { fillColor: [250, 250, 252] }
    });

    y = doc.lastAutoTable.finalY + 10;

    /* ---------- RODAPÉ ---------- */

    const pageCount = doc.internal.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {

        doc.setPage(i);

        doc.setDrawColor(...CINZA_CLARO);
        doc.setLineWidth(0.2);
        doc.line(margin, 284, pageW - margin, 284);

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...CINZA);

        doc.text(
            `Página ${i} de ${pageCount}  •  GATA · Univap`,
            pageW / 2,
            290,
            { align: "center" }
        );
    }

    doc.save(`boletim_${alunoObj.matricula || "aluno"}.pdf`);
}

/* =========================================================
   SAIR
========================================================= */

function sair() {
    sessionStorage.clear();
    window.location.replace("paginaLogin.html");
}

/* =========================================================
   FUNÇÕES GLOBAIS
========================================================= */

window.filtrarBimestre = filtrarBimestre;
window.contestarNota = contestarNota;
window.abrirModalContestacao = abrirModalContestacao;
window.fecharModalContestacao = fecharModalContestacao;
window.enviarContestacao = enviarContestacao;
window.baixarPDF = baixarPDF;
window.sair = sair;
window.carregarContestacoes = carregarContestacoes;
window.visualizarContestacao = visualizarContestacao;
window.fecharModalRespostaAluno = fecharModalRespostaAluno;
window.fecharModalSucesso = fecharModalSucesso;

/* =========================================================
   AO VOLTAR PARA A ABA: o coordenador pode ter fechado ou
   liberado as notas enquanto a página estava aberta
========================================================= */

document.addEventListener("visibilitychange", async () => {

    if (document.hidden) {
        return;
    }

    await carregarTrava();

    if (Object.keys(_porBimestre).length > 0) {
        atualizarBotoesContestacao();
    }
});

/* =========================================================
   INICIAR
========================================================= */

inicializar();