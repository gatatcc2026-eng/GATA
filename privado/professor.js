import ApiService from "./ApiService.js";

/* =========================================================
   DADOS DO LOGIN
========================================================= */

const token = sessionStorage.getItem("token");

const professorObj = JSON.parse(
    sessionStorage.getItem("dadosProfessor") || "null"
);

if (!token || !professorObj) {
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

/* =========================================================
   VARIÁVEIS
========================================================= */

let _minhasDisciplinas = [];
let _meusVinculos = [];
let _todasAdp = [];
let _mapaAlunos = {};
let _mapaDisciplinas = {};
let _mapaCursos = {};
let _mapaTurmas = {};
let _contestacaoResposta = { idContestacao: null, status: null };
let _graficoNotas = null;
let _notasFechadas = false;

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function normalizarId(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return null;
    }
    return String(valor);
}

/*
 * Clona um <template> do HTML e preenche os elementos que têm
 * data-campo="nome" com dados[nome] (via textContent, então já é seguro).
 */
function criarDeTemplate(idTemplate, dados = {}) {

    const tpl = document.getElementById(idTemplate);

    if (!tpl) {
        throw new Error(`Template "${idTemplate}" não encontrado no HTML.`);
    }

    const no = tpl.content.firstElementChild.cloneNode(true);

    [no, ...no.querySelectorAll("[data-campo]")].forEach(el => {

        const campo = el.dataset.campo;

        if (campo !== undefined && Object.prototype.hasOwnProperty.call(dados, campo)) {
            el.textContent = dados[campo] ?? "";
        }
    });

    return no;
}

function mostrarMensagemTabela(texto, erro = false) {

    const tbody = document.getElementById("tabelaAlunos");

    if (!tbody) {
        return;
    }

    const linha = criarDeTemplate("tpl-linha-mensagem", { texto });

    if (erro) {
        linha.firstElementChild.classList.add("celula-erro");
    }

    tbody.replaceChildren(linha);
}

/*
 * Converte qualquer status vindo da API
 * (inclusive valores antigos) para um dos 3 válidos.
 */
function normalizarStatusContestacao(status) {

    if (status === null || status === undefined || status === "") {
        return STATUS_EM_ANALISE;
    }

    const s = String(status).trim().toLowerCase();

    if (["em análise", "em analise", "análise", "analise", "pendente", "pending"].includes(s)) {
        return STATUS_EM_ANALISE;
    }

    if (["alterado", "alterada", "alterar", "aprovada", "aprovado", "aceita", "aceito", "approved"].includes(s)) {
        return STATUS_ALTERADO;
    }

    if (["recusada", "recusado", "rejeitada", "rejeitado", "rejected", "denied"].includes(s)) {
        return STATUS_RECUSADA;
    }

    return STATUS_EM_ANALISE;
}

/* =========================================================
   CURSO DA DISCIPLINA/TURMA SELECIONADA
   (a trava de notas é por curso da disciplina)
========================================================= */

function obterCursoSelecionado() {

    const idDisciplina = document.getElementById("selectDisciplina")?.value;
    const idTurma = document.getElementById("selectTurma")?.value;

    const vinculo =
        _meusVinculos.find(v =>
            String(v.idDisciplina) === String(idDisciplina) &&
            String(v.idTurma) === String(idTurma)
        ) ??
        _meusVinculos.find(v =>
            String(v.idDisciplina) === String(idDisciplina)
        );

    let idCurso = vinculo?.idCurso;

    if (idCurso === null || idCurso === undefined) {

        const turma = _mapaTurmas[normalizarId(idTurma)];

        idCurso =
            turma?.Curso_idCurso ??
            turma?.curso?.idCurso ??
            turma?.curso?.id ??
            turma?.idCurso;
    }

    return idCurso ?? null;
}

/* =========================================================
   TRAVA DE NOTAS (POR CURSO)
========================================================= */

async function verificarNotasFechadas(idCurso) {

    _notasFechadas = false;

    if (idCurso === null || idCurso === undefined) {
        return;
    }

    /* O coordenador do próprio curso nunca fica travado. */
    if (Number(professorObj?.cursoCoordenado) === Number(idCurso)) {
        return;
    }

    try {

        const config = await api.get(`/api/v1/notas-config?idCurso=${idCurso}`);

        if (
            config?.idCurso !== null &&
            config?.idCurso !== undefined &&
            Number(config.idCurso) === Number(idCurso)
        ) {

            _notasFechadas = Number(config?.notasFechadas) === 1;

        } else if (Array.isArray(config?.cursosFechados)) {

            _notasFechadas = config.cursosFechados.some(c =>
                Number(typeof c === "object" ? (c?.idCurso ?? c?.id) : c) === Number(idCurso)
            );

        } else {

            _notasFechadas = false;
        }

    } catch (erro) {
        _notasFechadas = false;
    }
}

function aplicarTravaNotas() {

    const inputs = document.querySelectorAll(".input-nota");
    const btnSalvar = document.getElementById("btnSalvarNotas");
    const tabela = document.getElementById("tabelaAlunos")?.closest("table");

    inputs.forEach(input => {
        input.disabled = _notasFechadas;
        input.title = _notasFechadas ? "Notas deste curso fechadas pelo coordenador" : "";
    });

    if (btnSalvar) {
        btnSalvar.disabled = _notasFechadas;
        btnSalvar.style.opacity = _notasFechadas ? "0.5" : "1";
        btnSalvar.style.cursor = _notasFechadas ? "not-allowed" : "pointer";
    }

    let aviso = document.getElementById("avisoNotasFechadas");

    if (_notasFechadas) {

        if (!aviso && tabela) {
            aviso = criarDeTemplate("tpl-aviso-notas-fechadas");
            tabela.parentElement.insertBefore(aviso, tabela);
        }

    } else if (aviso) {
        aviso.remove();
    }
}

/* =========================================================
   CARREGAR CURSOS
========================================================= */

async function carregarCursos() {
    try {
        const resposta = await api.get("/api/v1/cursos");

        const cursos = Array.isArray(resposta)
            ? resposta
            : Array.isArray(resposta?.data) ? resposta.data : [];

        _mapaCursos = {};

        cursos.forEach(curso => {
            const id = curso.idCurso ?? curso.id ?? curso.Curso_idCurso;
            if (id === null || id === undefined) {
                return;
            }
            _mapaCursos[normalizarId(id)] =
                curso.nomeCurso ?? curso.nome ?? `Curso ${id}`;
        });


    } catch (erro) {
        _mapaCursos = {};
    }
}

/* =========================================================
   CARREGAR TODAS AS TURMAS
========================================================= */

async function carregarTurmasMapa() {
    try {
        const resposta = await api.get("/api/v1/turmas");

        const turmas = Array.isArray(resposta)
            ? resposta
            : Array.isArray(resposta?.data) ? resposta.data : [];

        _mapaTurmas = {};

        turmas.forEach(turma => {
            const id = turma.idTurma ?? turma.id;
            if (id === null || id === undefined) {
                return;
            }
            _mapaTurmas[normalizarId(id)] = turma;
        });

    } catch (erro) {
        _mapaTurmas = {};
    }
}

function obterNomeCurso(idCurso) {
    if (idCurso === null || idCurso === undefined) {
        return "—";
    }
    return _mapaCursos[normalizarId(idCurso)] || "Curso não informado";
}

function obterNomeTurma(idTurma) {
    if (idTurma === null || idTurma === undefined) {
        return "—";
    }
    const turma = _mapaTurmas[normalizarId(idTurma)];
    return turma?.nomeTurma || turma?.nome || `Turma ${idTurma}`;
}

function obterCursoDoAluno(aluno) {
    return (
        aluno?.Curso_idCurso ??
        aluno?.curso?.idCurso ??
        aluno?.curso?.id ??
        aluno?.idCurso ??
        null
    );
}

function obterTurmaDoAluno(aluno) {
    return (
        aluno?.Turma_idTurma ??
        aluno?.turma?.idTurma ??
        aluno?.turma?.id ??
        aluno?.idTurma ??
        null
    );
}

/* =========================================================
   INICIALIZAR
========================================================= */

async function inicializar() {

    const headerNome = document.getElementById("headerNome");
    const infoNome = document.getElementById("infoNome");

    if (headerNome) {
        headerNome.textContent = professorObj.nome || "Professor";
    }

    if (infoNome) {
        infoNome.textContent = professorObj.nome || "—";
    }

    try {

        await Promise.all([carregarCursos(), carregarTurmasMapa()]);

        /* ---------- DISCIPLINAS ---------- */

        const todasDisciplinas = await api.get("/api/v1/disciplinas");

        const listaDisciplinas = Array.isArray(todasDisciplinas)
            ? todasDisciplinas
            : Array.isArray(todasDisciplinas?.data) ? todasDisciplinas.data : [];

        /* ---------- MEUS VÍNCULOS ---------- */

        const meusVinculos = [];

        listaDisciplinas.forEach(d => {

            const idDisciplina = d.idDisciplina ?? d.id;
            const nomeDisciplina = d.nomeDisciplina ?? d.nome ?? "Disciplina";
            const vinculosDaDisciplina = Array.isArray(d.professores) ? d.professores : [];

            vinculosDaDisciplina.forEach(v => {

                const registroProfessor =
                    v.registro ?? v.Professor_registro ?? v.professorRegistro;

                if (String(registroProfessor) === String(professorObj.registro)) {

                    meusVinculos.push({
                        idDisciplina,
                        nomeDisciplina,
                        idTurma: v.idTurma ?? v.Turma_idTurma,
                        idCurso:
                            v.idCurso ??
                            v.Curso_idCurso ??
                            d.Curso_idCurso ??
                            d.curso?.idCurso
                    });
                }
            });
        });

        _meusVinculos = meusVinculos;
        _minhasDisciplinas = listaDisciplinas.filter(d =>
            meusVinculos.some(v =>
                String(v.idDisciplina) === String(d.idDisciplina ?? d.id)
            )
        );

        if (_minhasDisciplinas.length === 0) {
            mostrarMensagemTabela("Nenhuma disciplina encontrada para este professor.");
            return;
        }

        _minhasDisciplinas.forEach(d => {
            const id = d.idDisciplina ?? d.id;
            _mapaDisciplinas[id] = d.nomeDisciplina ?? d.nome ?? "Disciplina";
        });

        /* ---------- SELECT DISCIPLINA ---------- */

        const disciplinasUnicas = [];
        const idsVistos = new Set();

        meusVinculos.forEach(v => {

            const chave = String(v.idDisciplina);

            if (!idsVistos.has(chave)) {
                idsVistos.add(chave);
                disciplinasUnicas.push({
                    idDisciplina: v.idDisciplina,
                    nomeDisciplina: v.nomeDisciplina
                });
            }
        });

        const selectDisciplina = document.getElementById("selectDisciplina");

        if (selectDisciplina) {

            selectDisciplina.replaceChildren();

            disciplinasUnicas.forEach(d => {
                const opt = document.createElement("option");
                opt.value = d.idDisciplina;
                opt.textContent = d.nomeDisciplina;
                selectDisciplina.appendChild(opt);
            });
        }

        /* ---------- ADP + ALUNOS ---------- */

        const [todasAdp, todosAlunos] = await Promise.all([
            api.get("/api/v1/aluno-disciplina-professor"),
            api.get("/api/v1/alunos")
        ]);

        _mapaAlunos = {};

        if (Array.isArray(todosAlunos)) {
            todosAlunos.forEach(aluno => {
                if (aluno?.matricula === null || aluno?.matricula === undefined) {
                    return;
                }
                _mapaAlunos[String(aluno.matricula)] = aluno;
            });
        }

        const idsDisciplinas = new Set(
            _minhasDisciplinas.map(d => String(d.idDisciplina ?? d.id))
        );

        _todasAdp = Array.isArray(todasAdp)
            ? todasAdp.filter(rel => {
                const idDisciplina =
                    rel.Disciplina_idDisciplina ??
                    rel.disciplina?.idDisciplina ??
                    rel.disciplina?.id;
                return idsDisciplinas.has(String(idDisciplina));
            })
            : [];

        await atualizarTurmasDisponiveis();

        await carregarAlunos();

    } catch (erro) {
        mostrarMensagemTabela("Erro ao carregar os dados.", true);
    }
}

/* =========================================================
   ATUALIZAR TURMAS DISPONÍVEIS
========================================================= */

async function atualizarTurmasDisponiveis() {

    const selectDisciplina = document.getElementById("selectDisciplina");
    const selectTurma = document.getElementById("selectTurma");

    if (!selectDisciplina || !selectTurma) {
        return;
    }

    const idDisciplinaSelecionada = selectDisciplina.value;

    const turmaIdsValidos = [
        ...new Set(
            _meusVinculos
                .filter(v => String(v.idDisciplina) === String(idDisciplinaSelecionada))
                .map(v => v.idTurma)
                .filter(id => id !== null && id !== undefined)
        )
    ];

    selectTurma.replaceChildren();

    if (turmaIdsValidos.length === 0) {
        return;
    }

    const turmas = await Promise.all(
        turmaIdsValidos.map(async id => {

            const turmaLocal = _mapaTurmas[normalizarId(id)];

            if (turmaLocal) {
                return turmaLocal;
            }

            return api.getById("/api/v1/turmas", id).catch(() => null);
        })
    );

    turmas.forEach((turma, i) => {

        if (!turma) {
            return;
        }

        const opt = document.createElement("option");
        opt.value = turmaIdsValidos[i];
        opt.textContent =
            turma.nomeTurma || turma.nome || `Turma ${turmaIdsValidos[i]}`;
        selectTurma.appendChild(opt);
    });
}

async function aoTrocarDisciplina() {
    await atualizarTurmasDisponiveis();
    await carregarAlunos();
}

/* =========================================================
   CARREGAR ALUNOS + NOTAS
========================================================= */

async function carregarAlunos() {

    const turmaId = document.getElementById("selectTurma")?.value;
    const disciplinaId = document.getElementById("selectDisciplina")?.value;
    const bimestre = document.getElementById("filtroBimestre")?.value;
    const tbody = document.getElementById("tabelaAlunos");
    const thead = document.getElementById("tabelaHead");

    if (!tbody || !thead) {
        return;
    }

    const todos = bimestre === "todos";

    mostrarMensagemTabela("Carregando...");

    try {

        await verificarNotasFechadas(obterCursoSelecionado());

        /* ---------- ALUNOS ATUALIZADOS ---------- */

        const alunosAtualizados = await api.get("/api/v1/alunos");

        if (Array.isArray(alunosAtualizados)) {

            _mapaAlunos = {};

            alunosAtualizados.forEach(aluno => {
                if (aluno?.matricula !== null && aluno?.matricula !== undefined) {
                    _mapaAlunos[String(aluno.matricula)] = aluno;
                }
            });
        }

        /* ---------- ADP ATUALIZADO ---------- */

        const adpAtualizados = await api.get("/api/v1/aluno-disciplina-professor");

        if (Array.isArray(adpAtualizados)) {

            const idsDisciplinas = new Set(
                _minhasDisciplinas.map(d => String(d.idDisciplina ?? d.id))
            );

            _todasAdp = adpAtualizados.filter(rel => {
                const idDisciplina =
                    rel.Disciplina_idDisciplina ??
                    rel.disciplina?.idDisciplina ??
                    rel.disciplina?.id;
                return idsDisciplinas.has(String(idDisciplina));
            });
        }

        /* ---------- ALUNOS DA TURMA + DISCIPLINA ---------- */

        const adpDaTurma = _todasAdp.filter(rel => {

            const matricula = rel.Aluno_matricula ?? rel.aluno?.matricula;
            const aluno = _mapaAlunos[String(matricula)];

            if (!aluno) {
                return false;
            }

            const idTurma = obterTurmaDoAluno(aluno);

            const idDisciplina =
                rel.Disciplina_idDisciplina ??
                rel.disciplina?.idDisciplina ??
                rel.disciplina?.id;

            return (
                String(idTurma) === String(turmaId) &&
                String(idDisciplina) === String(disciplinaId)
            );
        });
        if (adpDaTurma.length === 0) {

            mostrarMensagemTabela("Nenhum aluno nessa turma.");

            await atualizarInfoCard(turmaId);

            return;
        }

        await atualizarInfoCard(turmaId);

        /* ---------- NOTAS ---------- */

        const respostaNotas = await api.get("/api/v1/notas");

        const todasNotas = Array.isArray(respostaNotas)
            ? respostaNotas
            : Array.isArray(respostaNotas?.data)
                ? respostaNotas.data
                : Array.isArray(respostaNotas?.notas) ? respostaNotas.notas : [];

        const bimestres = todos
            ? ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"]
            : [bimestre];

        const mapaNotas = {};

        adpDaTurma.forEach(rel => {
            const idAdp = rel.idAlunoDisciplinaProfessor ?? rel.id ?? rel.ID;
            if (idAdp !== null && idAdp !== undefined) {
                mapaNotas[String(idAdp)] = {};
            }
        });

        todasNotas.forEach(nota => {

            const idAdp =
                nota.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor ??
                nota.alunoDisciplinaProfessor?.idAlunoDisciplinaProfessor ??
                nota.AlunoDisciplinaProfessor?.idAlunoDisciplinaProfessor ??
                nota.idAlunoDisciplinaProfessor ??
                nota.idAdp;

            if (idAdp === null || idAdp === undefined) {
                return;
            }

            const chave = String(idAdp);

            if (!mapaNotas[chave]) {
                return;
            }

            const valorBimestre =
                nota.bimestre ?? nota.Bimestre ?? nota.periodo ?? nota.Periodo;

            if (valorBimestre === undefined || valorBimestre === null) {
                return;
            }

            const texto = String(valorBimestre).trim().toLowerCase();

            let numeroBimestre;

            if (texto.includes("1")) {
                numeroBimestre = 1;
            } else if (texto.includes("2")) {
                numeroBimestre = 2;
            } else if (texto.includes("3")) {
                numeroBimestre = 3;
            } else if (texto.includes("4")) {
                numeroBimestre = 4;
            }

            if (!numeroBimestre) {
                return;
            }

            mapaNotas[chave][`${numeroBimestre}º Bimestre`] = nota;
        });

        /* ---------- CABEÇALHO ---------- */

        const cabecalho = criarDeTemplate("tpl-cabecalho-notas");

        bimestres.forEach(b => {
            cabecalho.appendChild(criarDeTemplate("tpl-th-bimestre", { titulo: b }));
        });

        thead.replaceChildren(cabecalho);

        atualizarGrafico(adpDaTurma, mapaNotas, bimestre);

        /* ---------- RENDERIZAR ---------- */

        tbody.replaceChildren();

        adpDaTurma.forEach(rel => {

            const matricula = rel.Aluno_matricula ?? rel.aluno?.matricula ?? "—";
            const aluno = _mapaAlunos[String(matricula)] ?? {};
            const idAdp = rel.idAlunoDisciplinaProfessor ?? rel.id ?? rel.ID;
            const notas = mapaNotas[String(idAdp)] ?? {};

            const linha = criarDeTemplate("tpl-linha-aluno", {
                matricula: matricula,
                nome: aluno.nome ?? matricula
            });

            bimestres.forEach(bimestreAtual => {

                const notaObj = notas[bimestreAtual];
                const valorNota = notaObj?.nota ?? notaObj?.Nota ?? null;

                const notaFormatada =
                    valorNota !== null && valorNota !== undefined && valorNota !== ""
                        ? Number(valorNota).toFixed(1)
                        : "";

                const idNota = notaObj?.idNota ?? notaObj?.IdNota ?? notaObj?.id ?? "";

                const celula = criarDeTemplate("tpl-celula-nota");
                const input = celula.querySelector(".input-nota");

                input.value = notaFormatada;
                input.dataset.idadp = idAdp;
                input.dataset.idnota = idNota;
                input.dataset.bimestre = bimestreAtual;

                linha.appendChild(celula);
            });

            tbody.appendChild(linha);
        });

        aplicarTravaNotas();

    } catch (erro) {
        mostrarMensagemTabela("Erro ao carregar alunos e notas.", true);
    }
}

/* =========================================================
   GRÁFICO DE NOTAS
========================================================= */

function atualizarGrafico(adpDaTurma, mapaNotas, bimestreSelecionado) {

    const canvas = document.getElementById("graficoNotas");

    if (typeof Chart === "undefined") {
        return;
    }

    if (!canvas) {
        return;
    }

    const notasAlunos = [];

    adpDaTurma.forEach(rel => {

        const idAdp = rel.idAlunoDisciplinaProfessor ?? rel.id ?? rel.ID;

        if (idAdp === null || idAdp === undefined) {
            return;
        }

        const notas = mapaNotas[String(idAdp)] ?? {};

        let notaFinal = null;

        if (bimestreSelecionado === "todos") {

            const valores = [];

            ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"].forEach(nomeBimestre => {

                const notaObj = notas[nomeBimestre];
                const valor = notaObj?.nota ?? notaObj?.Nota;

                if (valor !== null && valor !== undefined && valor !== "") {
                    const numero = Number(valor);
                    if (!isNaN(numero)) {
                        valores.push(numero);
                    }
                }
            });

            if (valores.length > 0) {
                notaFinal = valores.reduce((t, v) => t + v, 0) / valores.length;
            }

        } else {

            const notaObj = notas[bimestreSelecionado];
            const valor = notaObj?.nota ?? notaObj?.Nota;

            if (valor !== null && valor !== undefined && valor !== "") {
                const numero = Number(valor);
                if (!isNaN(numero)) {
                    notaFinal = numero;
                }
            }
        }

        if (notaFinal !== null) {
            notasAlunos.push(notaFinal);
        }
    });

    const quantidadePorNota = Array(11).fill(0);

    notasAlunos.forEach(nota => {

        let arredondada = Math.floor(nota);

        if (arredondada < 0) {
            arredondada = 0;
        }

        if (arredondada > 10) {
            arredondada = 10;
        }

        quantidadePorNota[arredondada]++;
    });

    const elementoMedia = document.getElementById("mediaTurma");

    let mediaTurma = 0;

    if (notasAlunos.length > 0) {
        mediaTurma = notasAlunos.reduce((t, n) => t + n, 0) / notasAlunos.length;
    }

    if (elementoMedia) {
        elementoMedia.textContent =
            notasAlunos.length > 0 ? mediaTurma.toFixed(1) : "—";
    }

    const subtitulo = document.getElementById("graficoSubtitulo");

    if (subtitulo) {
        subtitulo.textContent =
            bimestreSelecionado === "todos"
                ? "Distribuição das médias finais dos alunos"
                : `Distribuição das notas — ${bimestreSelecionado}`;
    }

    if (_graficoNotas) {
        _graficoNotas.destroy();
        _graficoNotas = null;
    }

    _graficoNotas = new Chart(canvas, {

        type: "bar",

        data: {
            labels: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
            datasets: [{
                label: "Quantidade de alunos",
                data: quantidadePorNota,
                backgroundColor: "#1a3a8a",
                borderColor: "#1a3a8a",
                borderWidth: 1,
                borderRadius: 5,
                barPercentage: 0.72,
                categoryPercentage: 0.8
            }]
        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            interaction: { intersect: false, mode: "index" },

            plugins: {

                legend: { display: false },

                tooltip: {
                    backgroundColor: "#1a3a8a",
                    titleFont: { family: "Lato", size: 13, weight: "700" },
                    bodyFont: { family: "Lato", size: 12 },
                    padding: 10,
                    callbacks: {
                        label: function (contexto) {
                            const quantidade = contexto.raw;
                            if (quantidade === 1) {
                                return " 1 aluno";
                            }
                            return ` ${quantidade} alunos`;
                        }
                    }
                }
            },

            scales: {

                x: {
                    title: {
                        display: true,
                        text: "Nota",
                        color: "#6b7280",
                        font: { family: "Lato", size: 12, weight: "700" }
                    },
                    grid: { display: false },
                    ticks: {
                        color: "#374151",
                        font: { family: "Lato", size: 11 }
                    }
                },

                y: {
                    beginAtZero: true,
                    min: 0,
                    suggestedMax: Math.max(5, Math.max(...quantidadePorNota) + 1),
                    title: {
                        display: true,
                        text: "Quantidade de alunos",
                        color: "#6b7280",
                        font: { family: "Lato", size: 12, weight: "700" }
                    },
                    ticks: {
                        precision: 0,
                        stepSize: 1,
                        color: "#374151",
                        font: { family: "Lato", size: 11 }
                    },
                    grid: { color: "#e5e7eb" }
                }
            }
        }
    });
}

/* =========================================================
   INFO DA TURMA E CURSO
========================================================= */

async function atualizarInfoCard(turmaId) {

    if (!turmaId) {
        return;
    }

    try {

        let turma = _mapaTurmas[normalizarId(turmaId)];

        if (!turma) {
            turma = await api.getById("/api/v1/turmas", turmaId);
        }

        if (turma) {
            _mapaTurmas[normalizarId(turmaId)] = turma;
        }

        const infoTurma = document.getElementById("infoTurma");

        if (infoTurma) {
            infoTurma.textContent = turma?.nomeTurma || turma?.nome || "—";
        }

        const idCurso =
            turma?.Curso_idCurso ??
            turma?.curso?.idCurso ??
            turma?.curso?.id ??
            turma?.idCurso;

        const nomeCurso = obterNomeCurso(idCurso);

        const infoCurso = document.getElementById("infoCurso");

        if (infoCurso) {
            infoCurso.textContent = nomeCurso;
        }

        const cursoProfessor = document.getElementById("cursoProfessor");

        if (cursoProfessor) {
            cursoProfessor.textContent = nomeCurso;
        }

    } catch (erro) {

        const infoTurma = document.getElementById("infoTurma");

        if (infoTurma) {
            infoTurma.textContent = "—";
        }

        const infoCurso = document.getElementById("infoCurso");

        if (infoCurso) {
            infoCurso.textContent = "—";
        }
    }
}

/* =========================================================
   SALVAR NOTAS
========================================================= */

async function salvarNotas() {

    await verificarNotasFechadas(obterCursoSelecionado());

    if (_notasFechadas) {
        aplicarTravaNotas();
        popupInfo("As notas deste curso estão fechadas pelo coordenador.");
        return;
    }

    const inputs = document.querySelectorAll(".input-nota");
    const btn = document.getElementById("btnSalvarNotas");

    if (!inputs.length) {
        popupInfo("Nenhuma nota para salvar.");
        return;
    }

    if (btn) {
        btn.textContent = "Salvando...";
        btn.disabled = true;
    }

    try {

        const promessas = [];

        inputs.forEach(input => {

            const valor = input.value.trim();
            const nota = parseFloat(valor);
            const idAdp = parseInt(input.dataset.idadp);
            const idNota = input.dataset.idnota ? parseInt(input.dataset.idnota) : null;
            const bimestre = input.dataset.bimestre;

            if (valor === "" || isNaN(nota)) {
                return;
            }

            if (nota < 0 || nota > 10) {
                throw new Error("A nota deve estar entre 0 e 10.");
            }

            if (!idAdp || isNaN(idAdp)) {
                return;
            }

            if (!bimestre) {
                return;
            }

            const payload = {
                nota: nota,
                bimestre: bimestre,
                idAlunoDisciplinaProfessor: idAdp
            };

            if (idNota) {

                promessas.push(api.put("/api/v1/notas", idNota, payload));

            } else {

                promessas.push(
                    api.post("/api/v1/notas", payload).then(novaNota => {
                        if (novaNota?.idNota) {
                            input.dataset.idnota = novaNota.idNota;
                        }
                    })
                );
            }
        });

        await Promise.all(promessas);

        popupSucesso("Notas salvas com sucesso!");

        await carregarAlunos();

    } catch (erro) {
        popupErro(erro?.message || "Erro ao salvar notas. Tente novamente.");

    } finally {

        if (btn) {
            btn.textContent = "Salvar Notas";
            btn.disabled = _notasFechadas;
        }
    }
}

/* =========================================================
   CONTESTAÇÕES
========================================================= */

function formatarNota(valor) {

    if (valor === null || valor === undefined || valor === "") {
        return "—";
    }

    const numero = Number(valor);

    return Number.isNaN(numero) ? "—" : numero.toFixed(1);
}

function criarCardContestacao(c) {

    const status = normalizarStatusContestacao(c.status);
    const id = c.idContestacao ?? c.id ?? c.ID;

    const card = criarDeTemplate("tpl-contestacao-card", {
        aluno: c.alunoNome || c.nomeAluno || "Aluno não informado",
        matricula: `Matrícula: ${c.matricula || c.Aluno_matricula || "—"}`,
        status: status,
        turma: c.nomeTurma || "—",
        disciplina: c.nomeDisciplina || "—",
        bimestre: c.bimestre || "—",
        data: formatarData(c.dataContestacao),
        notaAnterior: formatarNota(c.notaAnterior),
        notaAtual: formatarNota(c.notaAtual),
        motivo: c.motivo || "Nenhum motivo informado.",
        resposta: c.resposta || ""
    });

    card.dataset.id = id;

    card.querySelector('[data-campo="status"]')
        .classList.add(obterClasseStatus(status));

    /* "Nota atual" só faz sentido depois que a nota foi alterada. */
    if (status !== STATUS_ALTERADO) {
        card.querySelector('[data-bloco="nota-atual"]')?.remove();
    }

    /* Só mostra "Sua resposta" se já houver resposta. */
    if (!c.resposta) {
        card.querySelector(".contestacao-resposta")?.remove();
    }

    /* O professor só responde enquanto estiver em análise. */
    const acoes = card.querySelector(".contestacao-acoes");

    if (status !== STATUS_EM_ANALISE) {

        acoes?.remove();

    } else if (acoes) {

        acoes.querySelector('[data-acao="alterar"]')
            .addEventListener("click", () => responderContestacao(id, STATUS_ALTERADO));

        acoes.querySelector('[data-acao="recusar"]')
            .addEventListener("click", () => responderContestacao(id, STATUS_RECUSADA));
    }

    return card;
}

async function abrirContestacoes() {

    const registro = professorObj.registro;

    if (!registro) {
        popupErro("Registro do professor não encontrado.");
        return;
    }

    try {

        const resposta = await api.get(`/api/v1/contestacoes/professor/${registro}`);

        const contestacoes = Array.isArray(resposta)
            ? resposta
            : Array.isArray(resposta?.requisicoes)
                ? resposta.requisicoes
                : Array.isArray(resposta?.data) ? resposta.data : [];

        const modal = document.getElementById("modalContestacoes");
        const lista = document.getElementById("listaContestacoes");

        if (!modal || !lista) {
            popupErro("A janela de contestações não foi encontrada no HTML.");
            return;
        }

        lista.replaceChildren();

        if (contestacoes.length === 0) {
            popupInfo("Nenhuma contestação encontrada.");
            return;
        }

        contestacoes.forEach(c => lista.appendChild(criarCardContestacao(c)));

        modal.style.display = "flex";

    } catch (erro) {

        popupErro(erro?.message || "Erro ao carregar as contestações.");
    }
}

function fecharContestacoes() {

    const modal = document.getElementById("modalContestacoes");

    if (modal) {
        modal.style.display = "none";
    }

    document.getElementById("listaContestacoes")?.replaceChildren();
}

/* =========================================================
   RESPONDER CONTESTAÇÃO
========================================================= */

function responderContestacao(idContestacao, status) {
    if (!idContestacao) {
        popupErro("Contestação não encontrada.");
        return;
    }

    /* Só as duas ações válidas para o professor. */
    if (status !== STATUS_ALTERADO && status !== STATUS_RECUSADA) {
        popupErro("Ação inválida para esta contestação.");
        return;
    }

    _contestacaoResposta.idContestacao = idContestacao;
    _contestacaoResposta.status = status;

    const modal = document.getElementById("modalRespostaContestacao");
    const textarea = document.getElementById("textoRespostaContestacao");
    const titulo = document.getElementById("tituloRespostaContestacao");
    const descricao = document.getElementById("descricaoRespostaContestacao");
    const btnEnviar = document.getElementById("btnEnviarRespostaContestacao");

    if (!modal) {
        popupErro("A janela de resposta não foi encontrada no HTML.");
        return;
    }

    if (textarea) {
        textarea.value = "";
    }

    if (status === STATUS_ALTERADO) {

        if (titulo) {
            titulo.textContent = "Alterar nota";
        }

        if (descricao) {
            descricao.textContent =
                "Escreva uma mensagem explicando ao aluno que a contestação foi aceita e que a nota será alterada.";
        }

        if (btnEnviar) {
            btnEnviar.textContent = "Alterar nota e enviar resposta";
            btnEnviar.className = "btn-resposta-enviar resposta-aprovar";
        }

    } else {

        if (titulo) {
            titulo.textContent = "Recusar contestação";
        }

        if (descricao) {
            descricao.textContent =
                "Escreva uma mensagem explicando ao aluno o motivo da recusa.";
        }

        if (btnEnviar) {
            btnEnviar.textContent = "Recusar e enviar resposta";
            btnEnviar.className = "btn-resposta-enviar resposta-recusar";
        }
    }

    modal.style.display = "flex";

    setTimeout(() => {
        textarea?.focus();
    }, 50);
}

function fecharModalRespostaContestacao() {

    const modal = document.getElementById("modalRespostaContestacao");

    if (modal) {
        modal.style.display = "none";
    }

    const textarea = document.getElementById("textoRespostaContestacao");

    if (textarea) {
        textarea.value = "";
    }

    _contestacaoResposta = { idContestacao: null, status: null };
}

/* =========================================================
   ENVIAR RESPOSTA
========================================================= */

async function enviarRespostaContestacao() {

    const idContestacao = _contestacaoResposta.idContestacao;
    const status = _contestacaoResposta.status;
    const textarea = document.getElementById("textoRespostaContestacao");
    const btnEnviar = document.getElementById("btnEnviarRespostaContestacao");
    const resposta = textarea?.value.trim() || "";

    if (!idContestacao) {
        popupErro("Não foi possível identificar a contestação.");
        return;
    }

    if (!status) {
        popupErro("Não foi possível identificar a ação.");
        return;
    }

    if (!resposta) {
        popupErro("Digite uma mensagem para o aluno.");
        textarea?.focus();
        return;
    }

    if (status !== STATUS_ALTERADO && status !== STATUS_RECUSADA) {
        popupErro("Status inválido.");
        return;
    }

    try {

        if (btnEnviar) {
            btnEnviar.disabled = true;
            btnEnviar.textContent = "Enviando...";
        }

        const payload = {
            idContestacao: idContestacao,
            registroProfessor: professorObj.registro,
            status: status,
            resposta: resposta
        };
        /* O ApiService monta: /contestacoes/responder/{id} */
        await api.put(
            "/api/v1/contestacoes/responder",
            idContestacao,
            payload
        );

        fecharModalRespostaContestacao();

        fecharContestacoes();

        popupSucesso(
            status === STATUS_ALTERADO
                ? "Contestação aceita. A nota deverá ser alterada."
                : "Contestação recusada com sucesso."
        );

    } catch (erro) {
        popupErro(erro?.message || "Erro ao responder a contestação.");

    } finally {

        const botao = document.getElementById("btnEnviarRespostaContestacao");

        if (botao) {
            botao.disabled = false;
        }
    }
}

/* =========================================================
   CLASSE DO STATUS
   (reaproveita as classes CSS já existentes no HTML)
========================================================= */

function obterClasseStatus(status) {

    switch (normalizarStatusContestacao(status)) {

        case STATUS_ALTERADO:
            return "status-aprovada";

        case STATUS_RECUSADA:
            return "status-recusada";

        default:
            return "status-pendente";
    }
}

/* =========================================================
   DATA
========================================================= */

function formatarData(data) {

    if (!data) {
        return "—";
    }

    try {
        return new Date(data).toLocaleString("pt-BR");
    } catch {
        return data;
    }
}

/* =========================================================
   SAIR
========================================================= */

function sair() {
    sessionStorage.clear();
    window.location.replace("paginaLogin.html");
}

/* =========================================================
   EVENTOS (substituem os onclick/onchange que ficavam no HTML)
========================================================= */

document.getElementById("btnSair")
    ?.addEventListener("click", sair);

document.getElementById("btnContestacoes")
    ?.addEventListener("click", abrirContestacoes);

document.getElementById("btnSalvarNotas")
    ?.addEventListener("click", salvarNotas);

document.getElementById("selectTurma")
    ?.addEventListener("change", carregarAlunos);

document.getElementById("filtroBimestre")
    ?.addEventListener("change", carregarAlunos);

document.getElementById("selectDisciplina")
    ?.addEventListener("change", aoTrocarDisciplina);

document.getElementById("btnFecharContestacoes")
    ?.addEventListener("click", fecharContestacoes);

document.getElementById("btnFecharResposta")
    ?.addEventListener("click", fecharModalRespostaContestacao);

document.getElementById("btnCancelarResposta")
    ?.addEventListener("click", fecharModalRespostaContestacao);

document.getElementById("btnEnviarRespostaContestacao")
    ?.addEventListener("click", enviarRespostaContestacao);

/* =========================================================
   INICIALIZAR SISTEMA
========================================================= */

inicializar();