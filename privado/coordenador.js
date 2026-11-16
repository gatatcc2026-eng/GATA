import ApiService from "./ApiService.js";
const API_DISCIPLINAS = "/api/v1/disciplinas";
const API_ALUNODISCIPLINAPROFESSOR = "/api/v1/aluno-disciplina-professor";
const API_HISTORICO_COORDENADOR = "/api/v1/historico-coordenador";
const API_PROFESSORES_TODOS = "/api/v1/professores?todos=true";
const API_PROFESSORES = "/api/v1/professores";
const API_SOLICITACOES_PROFESSOR = "/api/v1/solicitacoes-professor";

let _graficoNotas = null;
let _contestacaoResposta = { idContestacao: null, status: null };

/* =========================================================
CONFIGURAÇÃO INICIAL
========================================================= */

const token = sessionStorage.getItem("token");

const professorLogado = JSON.parse(
    sessionStorage.getItem("dadosProfessor") || "null"
);

if (!token || !professorLogado) {
    sessionStorage.clear();
    window.location.replace("paginaLogin.html");
    throw new Error("Sessão inexistente. Redirecionando para o login.");
}

const api = new ApiService(token);

const areaConteudo = document.getElementById("areaConteudo");

function clonarTemplate(id) {

    const template = document.getElementById(id);

    if (!template) {
        throw new Error(`Template "${id}" não encontrado no HTML.`);
    }

    return template.content.cloneNode(true);

}

function valorVazio(valor) {
    return valor === null || valor === undefined || valor === "";
}

function preencher(no, dados = {}) {

    no.querySelectorAll("[data-campo]").forEach(el => {

        const valor = dados[el.dataset.campo];

        el.textContent = valorVazio(valor)
            ? (el.dataset.padrao ?? "")
            : String(valor);

    });

    no.querySelectorAll("[data-anexar]").forEach(el => {

        const valor = dados[el.dataset.anexar];

        el.append(" " + (valorVazio(valor)
            ? (el.dataset.padrao ?? "—")
            : String(valor)));

    });

    return no;

}

/* Clona o template, preenche e devolve o primeiro elemento */
function criarElemento(idTemplate, dados = {}) {
    return preencher(clonarTemplate(idTemplate), dados).firstElementChild;
}

/* Troca o conteúdo da área principal por um template */
function mostrarTela(idTemplate, dados = {}) {
    areaConteudo.replaceChildren(preencher(clonarTemplate(idTemplate), dados));
}

function linhaVazia(tbody, colunas, texto) {

    const tr = criarElemento("tpl-linha-vazia");
    const td = tr.querySelector("td");

    td.colSpan = colunas;
    td.textContent = texto;

    tbody.replaceChildren(tr);

}

function criarAviso(titulo, texto = "") {

    const aviso = criarElemento("tpl-aviso", { titulo, texto });

    if (!texto) aviso.querySelector("p")?.remove();

    return aviso;

}

function criarCelula(conteudo, tag = "td") {

    const celula = document.createElement(tag);

    if (conteudo instanceof Node) {
        celula.appendChild(conteudo);
    } else {
        celula.textContent = conteudo ?? "";
    }

    return celula;

}

function criarLinha(celulas) {

    const tr = document.createElement("tr");

    celulas.forEach(celula => tr.appendChild(celula));

    return tr;

}

function adicionarOpcoes(select, itens, obterValor, obterTexto) {

    itens.forEach(item => {
        select.add(new Option(obterTexto(item), obterValor(item)));
    });

}

/* =========================================================
CURSO COORDENADO
========================================================= */

async function mostrarCursoCoordenado() {

    if (!professorLogado?.cursoCoordenado) return;

    /* liga os badges de solicitações (menu ADM, aluno e professor) */
    iniciarBadgesSolicitacoes();

    try {

        const cursos = await api.get("/api/v1/cursos");

        const cursoEncontrado = Array.isArray(cursos)
            ? cursos.find(c => Number(c.idCurso) === Number(professorLogado.cursoCoordenado))
            : null;

        const elemento = document.getElementById("nomeCursoCoordenado");

        if (elemento && cursoEncontrado) {
            elemento.textContent = `Coordenando: ${cursoEncontrado.nomeCurso}`;
        }

    } catch (erro) {
    }

}

mostrarCursoCoordenado();

/* ===========================
   MENUS LATERAIS
   (a seta é girada pelo CSS: .grupo-menu.aberto .seta)
=========================== */

document.querySelectorAll(".btn-grupo-menu").forEach(botao => {

    botao.addEventListener("click", () => {

        const grupoAtual = botao.closest(".grupo-menu");

        if (!grupoAtual) return;

        /* Fecha os outros menus */
        document.querySelectorAll(".grupo-menu").forEach(grupo => {
            if (grupo !== grupoAtual) grupo.classList.remove("aberto");
        });

        /* Abre / fecha o atual */
        grupoAtual.classList.toggle("aberto");

    });

});

/* ===========================
   SINO DO HISTÓRICO
=========================== */

const btnSinoHistorico = document.getElementById("btnSinoHistorico");

if (btnSinoHistorico) {

    btnSinoHistorico.addEventListener("click", async () => {
        await carregarHistoricoCoordenador();
        marcarHistoricoComoVisto();
    });

    atualizarBadgeHistorico();

}

/* =========================================================
HELPERS DO HISTÓRICO
Aceitam os nomes reais do banco (idHistorico / dataHora)
e os nomes antigos, caso o DAO renomeie as colunas.
========================================================= */

function obterIdHistorico(item) {
    return Number(
        item.idHistorico ??
        item.idHistoricoCoordenador ??
        item.id ??
        0
    );
}

function obterDataHistorico(item) {
    return (
        item.dataHora ??
        item.dataAcao ??
        item.data ??
        item.dataCriacao ??
        null
    );
}

function formatarDataHistorico(valor) {

    if (!valor) {
        return "-";
    }

    const data = new Date(valor);

    if (isNaN(data.getTime())) {
        return String(valor);
    }

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

/* =========================================================
BADGE
========================================================= */

async function atualizarBadgeHistorico() {

    try {
        const historico = await api.get(API_HISTORICO_COORDENADOR);

        if (!Array.isArray(historico) || historico.length === 0) {
            return;
        }

        const ultimoVistoId = Number(
            localStorage.getItem(
                `ultimoHistoricoCoordenadorVisto_${professorLogado.registro}`
            ) || 0
        );

        const naoLidos = historico.filter(
            item => obterIdHistorico(item) > ultimoVistoId
        ).length;

        const badge = document.getElementById("badgeHistorico");

        if (badge) {
            if (naoLidos > 0) {
                badge.textContent = naoLidos > 9 ? "9+" : naoLidos;
                badge.style.display = "flex";
            } else {
                badge.style.display = "none";
            }
        }

    } catch (erro) {
    }
}

function marcarHistoricoComoVisto() {

    api.get(API_HISTORICO_COORDENADOR).then(historico => {

        if (!Array.isArray(historico) || historico.length === 0) {
            return;
        }

        const maiorId = Math.max(...historico.map(obterIdHistorico));

        localStorage.setItem(
            `ultimoHistoricoCoordenadorVisto_${professorLogado.registro}`,
            maiorId
        );

        const badge = document.getElementById("badgeHistorico");
        if (badge) {
            badge.style.display = "none";
        }

    }).catch(erro => {
    });
}


/* ===========================
   BOTÕES DO MENU
=========================== */

function ligarBotaoMenu(id, funcao) {

    const botao = document.getElementById(id);

    if (botao) botao.addEventListener("click", funcao);

}

ligarBotaoMenu("btnProfessores", carregarProfessores);
ligarBotaoMenu("btnAlunos", carregarAlunos);
ligarBotaoMenu("btnCursos", carregarCursos);
ligarBotaoMenu("btnDisciplinas", carregarDisciplinas);
ligarBotaoMenu("btnTurmas", carregarTurmas);
ligarBotaoMenu("btnSolicitacoes", carregarSolicitacoes);
ligarBotaoMenu("btnLancarNotas", carregarNotas);
ligarBotaoMenu("btnVisualizarNotas", carregarVisualizacaoNotas);
ligarBotaoMenu("btnSolicitacoesProfessor", carregarSolicitacoesProfessor);

/* =========================================================
VISUALIZAÇÃO DE NOTAS (tela + fechar/liberar notas)
========================================================= */

async function carregarVisualizacaoNotas() {

    try {

        const [turmas, notas, disciplinas] = await Promise.all([
            api.get("/api/v1/turmas"),
            api.get("/api/v1/notas"),
            api.get("/api/v1/disciplinas")
        ]);

        const listaTurmas = Array.isArray(turmas) ? turmas : [];
        const listaNotas = Array.isArray(notas) ? notas : [];
        const listaDisciplinas = Array.isArray(disciplinas) ? disciplinas : [];

        mostrarTela("tpl-visualizacao-notas");

        adicionarOpcoes(
            document.getElementById("selectTurmaVisualizacao"),
            listaTurmas,
            turma => turma.idTurma,
            turma => turma.nomeTurma
        );

        document.getElementById("btnBuscarVisualizacao").addEventListener("click", () => {
            mostrarNotasVisualizacao(listaTurmas, listaNotas, listaDisciplinas);
        });

        document.getElementById("btnBaixarPDFVisualizacao").addEventListener("click", () => {
            baixarPDFVisualizacao(listaTurmas, listaNotas);
        });

        /* =====================================================
           FECHAR / LIBERAR NOTAS
        ===================================================== */

        const btnFechar = document.getElementById("btnFecharNotas");
        const btnLiberar = document.getElementById("btnLiberarNotas");

        function atualizarBotoesTrava(fechadas) {

            btnFechar.disabled = fechadas;
            btnLiberar.disabled = !fechadas;

            btnFechar.style.opacity = fechadas ? "0.5" : "1";
            btnLiberar.style.opacity = fechadas ? "1" : "0.5";

            btnFechar.style.cursor = fechadas ? "not-allowed" : "pointer";
            btnLiberar.style.cursor = fechadas ? "pointer" : "not-allowed";

        }

        function pedirSenhaCoordenador() {

            return new Promise(resolve => {

                const fundo = criarElemento("tpl-modal-senha-trava");

                document.body.appendChild(fundo);

                const input = fundo.querySelector("#inputSenhaTrava");

                const fechar = valor => {
                    fundo.remove();
                    resolve(valor);
                };

                fundo.querySelector("#btnCancelarTrava")
                    .addEventListener("click", () => fechar(null));

                fundo.querySelector("#btnConfirmarTrava")
                    .addEventListener("click", () => fechar(input.value));

                input.addEventListener("keydown", e => {
                    if (e.key === "Enter") fechar(input.value);
                    if (e.key === "Escape") fechar(null);
                });

                input.focus();

            });

        }

        btnFechar.addEventListener("click", async () => {

            const senha = await pedirSenhaCoordenador();

            if (senha === null) return;

            if (!senha) {
                popupInfo("Digite a senha para fechar as notas.");
                return;
            }

            try {

                await api.post("/api/v1/notas-config/fechar", { senha });

                atualizarBotoesTrava(true);

                popupSucesso("Notas fechadas. Os professores não podem mais lançar ou alterar notas.");

            } catch (erro) {


                popupErro(erro.response?.error || "Não foi possível fechar as notas.");

            }

        });

        btnLiberar.addEventListener("click", async () => {

            try {

                await api.post("/api/v1/notas-config/liberar", {});

                atualizarBotoesTrava(false);

                popupSucesso("Notas liberadas para lançamento.");

            } catch (erro) {


                popupErro(erro.response?.error || "Não foi possível liberar as notas.");

            }

        });

        /* Estado inicial vindo do servidor */
        try {

            const config = await api.get("/api/v1/notas-config");

            atualizarBotoesTrava(Number(config?.notasFechadas) === 1);

        } catch (erroConfig) {


            atualizarBotoesTrava(false);

        }

    } catch (erro) {


        popupErro("Não foi possível carregar as notas.");

    }

}

/* =========================================================
BAIXAR PDF DA VISUALIZAÇÃO
========================================================= */

function baixarPDFVisualizacao(turmas, notas) {

    const selectTurma = document.getElementById("selectTurmaVisualizacao");
    const selectBimestre = document.getElementById("selectBimestreVisualizacao");

    const turmaSelecionada = selectTurma?.value;
    const bimestreSelecionado = selectBimestre?.value;

    if (!turmaSelecionada) {
        popupInfo("Selecione uma turma antes de baixar o PDF.");
        return;
    }

    const turma = turmas.find(t => String(t.idTurma) === String(turmaSelecionada));

    if (!turma) {
        popupErro("Turma não encontrada.");
        return;
    }

    const notasDaTurma = notas.filter(
        nota => String(nota.idTurma) === String(turmaSelecionada)
    );

    if (notasDaTurma.length === 0) {
        popupInfo("Não existem notas para gerar o PDF.");
        return;
    }

    const { jsPDF } = window.jspdf || {};

    if (!jsPDF) {
        popupErro("Não foi possível carregar o gerador de PDF.");
        return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    /* CORES */
    const AZUL = [26, 58, 138];
    const AZUL_CLARO = [238, 242, 249];
    const AZUL_FAIXA = [16, 38, 94];
    const AZUL_APROVADO = [37, 99, 235];
    const VERMELHO = [220, 38, 38];
    const CINZA = [107, 114, 128];
    const CINZA_CLARO = [229, 231, 235];

    /* DIMENSÕES */
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;

    /* CABEÇALHO */
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, pageW, 22, "F");

    doc.setFillColor(...AZUL_FAIXA);
    doc.rect(0, 22, pageW, 1, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("Visualização de Notas", margin, 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(210, 220, 240);
    doc.text("GATA · Sistema Acadêmico · Univap", margin, 18.5);

    const dataHoje = new Date().toLocaleDateString("pt-BR");

    doc.setTextColor(255, 255, 255);
    doc.text(`Emitido em ${dataHoje}`, pageW - margin, 13, { align: "right" });

    /* CARTÃO DA TURMA */
    let y = 30;

    const cardH = 16;
    const larguraCard = pageW - margin * 2;

    doc.setFillColor(...AZUL_CLARO);
    doc.roundedRect(margin, y, larguraCard, cardH, 2, 2, "F");

    const colunaTurma = margin + 6;
    const colunaBimestre = margin + larguraCard * 0.55;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...CINZA);
    doc.text("TURMA", colunaTurma, y + 6);
    doc.text("BIMESTRE", colunaBimestre, y + 6);

    doc.setFontSize(11);
    doc.setTextColor(...AZUL);
    doc.text(turma.nomeTurma ?? "—", colunaTurma, y + 12);
    doc.text(bimestreSelecionado || "Todos", colunaBimestre, y + 12);

    y += cardH + 8;

    const bimestres = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];

    /* FUNÇÕES AUXILIARES */
    function pegarMatricula(nota) {
        return String(nota.matricula ?? nota.Aluno_matricula ?? "").trim();
    }

    function pegarNome(nota) {
        return nota.nomeAluno ?? nota.nome ?? nota.Aluno_nome ?? "-";
    }

    function pegarNota(nota) {

        const valor = nota.nota ?? nota.valor ?? nota.notaFinal;

        if (valor === null || valor === undefined || valor === "") {
            return null;
        }

        const numero = Number(valor);

        return isNaN(numero) ? null : numero;
    }

    function encontrarNota(matricula, bimestre) {

        const item = notasDaTurma.find(nota => {

            const mesmoAluno = pegarMatricula(nota) === matricula;

            const mesmoBimestre =
                normalizarBimestre(nota.bimestre) === normalizarBimestre(bimestre);

            return mesmoAluno && mesmoBimestre;
        });

        return item ? pegarNota(item) : null;
    }

    function formatarNota(numero) {

        if (numero === null || numero === undefined) {
            return "—";
        }

        return Number(numero).toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });
    }

    function calcularMediaFinal(matricula) {

        const valores = [];

        bimestres.forEach(bimestre => {

            const nota = encontrarNota(matricula, bimestre);

            if (nota !== null) valores.push(nota);
        });

        if (valores.length === 0) return null;

        return valores.reduce((total, valor) => total + valor, 0) / valores.length;
    }

    /* LISTA DE ALUNOS */
    const alunosMap = new Map();

    notasDaTurma.forEach(nota => {

        const matricula = pegarMatricula(nota);

        if (!matricula) return;

        if (!alunosMap.has(matricula)) {
            alunosMap.set(matricula, { matricula, nome: pegarNome(nota) });
        }
    });

    const alunos = [...alunosMap.values()].sort((a, b) =>
        String(a.nome).localeCompare(String(b.nome), "pt-BR", { sensitivity: "base" })
    );

    if (alunos.length === 0) {
        popupInfo("Não existem alunos com notas para gerar o PDF.");
        return;
    }

    const cabecalhos = [
        "Matrícula",
        "Aluno",
        "1º Bimestre",
        "2º Bimestre",
        "3º Bimestre",
        "4º Bimestre",
        "Média Final"
    ];

    /* LINHAS */
    const linhas = alunos.map(aluno => {

        const notasAluno = bimestres.map(bimestre => {

            /* Se foi selecionado um bimestre, os outros ficam vazios */
            if (
                bimestreSelecionado &&
                normalizarBimestre(bimestre) !== normalizarBimestre(bimestreSelecionado)
            ) {
                return "—";
            }

            return formatarNota(encontrarNota(aluno.matricula, bimestre));
        });

        const mediaFinal = calcularMediaFinal(aluno.matricula);

        return [aluno.matricula, aluno.nome, ...notasAluno, formatarNota(mediaFinal)];
    });

    /* TABELA */
    doc.autoTable({

        startY: y,

        margin: { left: margin, right: margin, bottom: 20 },

        head: [cabecalhos],

        body: linhas,

        theme: "grid",

        styles: {
            font: "helvetica",
            fontSize: 8.5,
            cellPadding: 3.5,
            textColor: [55, 65, 81],
            lineColor: CINZA_CLARO,
            lineWidth: 0.2,
            valign: "middle"
        },

        headStyles: {
            fillColor: AZUL_CLARO,
            textColor: AZUL,
            fontStyle: "bold",
            fontSize: 8,
            halign: "center"
        },

        columnStyles: {
            0: { cellWidth: 28, halign: "center" },
            1: { cellWidth: 72, fontStyle: "bold" },
            2: { cellWidth: 27, halign: "center" },
            3: { cellWidth: 27, halign: "center" },
            4: { cellWidth: 27, halign: "center" },
            5: { cellWidth: 27, halign: "center" },
            6: { cellWidth: 30, halign: "center", fontStyle: "bold" }
        },

        didParseCell(data) {

            if (data.section !== "body") return;

            /* COLUNAS DE NOTA */
            if (data.column.index >= 2) {

                const valor = data.cell.raw;

                if (valor !== "—") {

                    const numero = Number(String(valor).replace(",", "."));

                    if (!isNaN(numero)) {

                        data.cell.styles.fontStyle = "bold";
                        data.cell.styles.halign = "center";
                        data.cell.styles.textColor = numero >= 6 ? AZUL_APROVADO : VERMELHO;
                    }
                }
            }
        },

        alternateRowStyles: { fillColor: [250, 250, 252] }
    });

    /* RODAPÉ */
    const totalPaginas = doc.internal.getNumberOfPages();

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {

        doc.setPage(pagina);

        doc.setDrawColor(...CINZA_CLARO);
        doc.setLineWidth(0.2);
        doc.line(margin, pageH - 15, pageW - margin, pageH - 15);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...CINZA);

        doc.text(
            `Página ${pagina} de ${totalPaginas}  •  GATA · Univap`,
            pageW / 2,
            pageH - 9,
            { align: "center" }
        );
    }

    /* NOME DO ARQUIVO + DOWNLOAD */
    const nomeArquivo = `notas_${turma.nomeTurma}`
        .replace(/\s+/g, "_")
        .replace(/[^\w-]/g, "");

    doc.save(`${nomeArquivo}.pdf`);
}

function normalizarBimestre(bimestre) {

    if (bimestre === null || bimestre === undefined) {
        return "";
    }

    return String(bimestre)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[º°]/g, "")
        .replace("bimestre", "")
        .trim();

}

/* =========================================================
VISUALIZAR NOTAS
SOMENTE CONSULTA
========================================================= */

function mostrarNotasVisualizacao(turmas, notas, disciplinas = []) {

    const resultado = document.getElementById("resultadoVisualizacaoNotas");

    if (!resultado) return;

    const turmaSelecionada = document.getElementById("selectTurmaVisualizacao")?.value;
    const disciplinaSelecionada = document.getElementById("selectDisciplinaVisualizacao")?.value;
    const bimestreSelecionado = document.getElementById("selectBimestreVisualizacao")?.value;
    const modoSelecionado = document.getElementById("selectModoVisualizacao")?.value || "todas";

    /* =====================================================
       AUXILIARES
    ===================================================== */

    const mostrarAviso = (titulo, texto = "") => {
        resultado.replaceChildren(criarAviso(titulo, texto));
    };

    function normalizarBimestre(valor) {

        if (valor === null || valor === undefined) return "";

        const texto = String(valor).trim().toLowerCase();
        const digito = texto.match(/[1-4]/);

        return digito ? `${digito[0]}º Bimestre` : texto;

    }

    function paraNumero(valor) {

        if (valor === null || valor === undefined || valor === "") return null;

        const numero = Number(String(valor).trim().replace(",", "."));

        return Number.isNaN(numero) ? null : numero;

    }
    function arredondarParaCima(numero) {
        return Math.ceil(Number((numero * 10).toFixed(6))) / 10;
    }

    function formatarNota(numero) {

        return numero !== null && numero !== undefined
            ? arredondarParaCima(numero).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
            : "-";

    }

    function calcularMedia(valores) {

        return valores.length > 0
            ? valores.reduce((total, v) => total + v, 0) / valores.length
            : null;

    }

    function obterMatricula(nota) {
        return String(nota.matricula ?? nota.Aluno_matricula ?? "").trim();
    }

    function obterValor(nota) {
        return paraNumero(nota.nota ?? nota.valor ?? nota.notaFinal);
    }

    /* Lista de alunos (matrícula + nome), ordenada por nome */
    function listarAlunos(listaNotas) {

        const mapa = new Map();

        listaNotas.forEach(nota => {

            const matricula = obterMatricula(nota);

            if (!matricula) return;

            if (!mapa.has(matricula)) {
                mapa.set(matricula, { matricula, nomeAluno: "—" });
            }

            if (nota.nomeAluno && mapa.get(matricula).nomeAluno === "—") {
                mapa.get(matricula).nomeAluno = nota.nomeAluno;
            }

        });

        return [...mapa.values()].sort((a, b) =>
            String(a.nomeAluno).localeCompare(String(b.nomeAluno), "pt-BR")
        );

    }

    /* Map matrícula -> [valores] das notas de um bimestre */
    function valoresDoBimestre(listaNotas, bimestre) {

        const mapa = new Map();

        listaNotas
            .filter(nota => normalizarBimestre(nota.bimestre) === bimestre)
            .forEach(nota => {

                const matricula = obterMatricula(nota);
                const valor = obterValor(nota);

                if (!matricula || valor === null) return;

                if (!mapa.has(matricula)) mapa.set(matricula, []);

                mapa.get(matricula).push(valor);

            });

        return mapa;

    }

    /* Map "matrícula|idDisciplina" -> [valores] das notas de um bimestre */
    function valoresDaDisciplina(listaNotas, bimestre) {

        const mapa = new Map();

        listaNotas
            .filter(nota => normalizarBimestre(nota.bimestre) === bimestre)
            .forEach(nota => {

                const matricula = obterMatricula(nota);
                const valor = obterValor(nota);

                if (!matricula || valor === null) return;

                const chave = `${matricula}|${Number(nota.idDisciplina)}`;

                if (!mapa.has(chave)) mapa.set(chave, []);

                mapa.get(chave).push(valor);

            });

        return mapa;

    }

    /* Monta um bloco de tabela a partir do template.
       colunas = [{ id, nome }] das disciplinas; vazio = só a média */
    function criarBloco(tag, tituloMedia, linhas, colunas) {

        const bloco = criarElemento("tpl-bloco-notas", { tag, tituloMedia });

        const linhaCabecalho = bloco.querySelector("thead tr");
        const thMedia = linhaCabecalho.querySelector(".col-media");

        colunas.forEach(coluna => {
            linhaCabecalho.insertBefore(criarCelula(coluna.nome, "th"), thMedia);
        });

        const tbody = bloco.querySelector("tbody");

        if (linhas.length === 0) {
            linhaVazia(tbody, 3 + colunas.length, "Sem notas lançadas");
            return bloco;
        }

        linhas.forEach(linha => {

            const strong = document.createElement("strong");
            strong.textContent = formatarNota(linha.media);

            const celulaMedia = criarCelula(strong);
            celulaMedia.className = "col-media";

            tbody.appendChild(criarLinha([
                criarCelula(linha.matricula),
                criarCelula(linha.nomeAluno),
                ...(linha.disciplinas ?? []).map(v => criarCelula(formatarNota(v))),
                celulaMedia
            ]));

        });

        return bloco;

    }

    /* =====================================================
       VALIDAÇÕES
    ===================================================== */

    if (!turmaSelecionada) {
        mostrarAviso("Atenção", "Selecione uma turma para visualizar as notas.");
        return;
    }

    const turma = turmas.find(t => Number(t.idTurma ?? t.id) === Number(turmaSelecionada));

    if (!turma) {
        mostrarAviso("Turma não encontrada.");
        return;
    }

    const bimestresFixos = ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"];
    const bimestreEscolhido = normalizarBimestre(bimestreSelecionado);

    /* =====================================================
       FILTRAR NOTAS (turma e, se selecionada, disciplina)
    ===================================================== */

    let notasDaTurma = notas.filter(nota => Number(nota.idTurma) === Number(turmaSelecionada));

    if (disciplinaSelecionada) {
        notasDaTurma = notasDaTurma.filter(
            nota => Number(nota.idDisciplina) === Number(disciplinaSelecionada)
        );
    }

    if (notasDaTurma.length === 0) {
        mostrarAviso(
            "Nenhuma nota encontrada",
            `Não existem notas cadastradas para ${turma.nomeTurma}.`
        );
        return;
    }

    if (bimestreEscolhido) {

        const temNotaNoBimestre = notasDaTurma.some(
            nota => normalizarBimestre(nota.bimestre) === bimestreEscolhido
        );

        if (!temNotaNoBimestre) {
            mostrarAviso(
                "Nenhuma nota encontrada",
                `Não existem notas cadastradas para ${turma.nomeTurma} no ${bimestreEscolhido}.`
            );
            return;
        }

    }

    /* =====================================================
       DISCIPLINAS DO CURSO DA TURMA (colunas da tabela)
    ===================================================== */

    const nomeDaDisciplina = id => {
        const d = disciplinas.find(x => Number(x.idDisciplina) === Number(id));
        return d?.nomeDisciplina ?? `Disciplina ${id}`;
    };

    let colunasDisciplinas = disciplinas
        .filter(d => Number(d.Curso_idCurso) === Number(turma.Curso_idCurso))
        .map(d => ({ id: Number(d.idDisciplina), nome: d.nomeDisciplina }));

    /* Se não achar disciplinas do curso, usa as que aparecem nas notas */
    if (colunasDisciplinas.length === 0) {

        const ids = [...new Set(
            notasDaTurma
                .map(nota => Number(nota.idDisciplina))
                .filter(id => Number.isInteger(id) && id > 0)
        )];

        colunasDisciplinas = ids.map(id => ({ id, nome: nomeDaDisciplina(id) }));

    }

    if (disciplinaSelecionada) {
        colunasDisciplinas = colunasDisciplinas.filter(c => c.id === Number(disciplinaSelecionada));
    }

    const mostrarDisciplinas = modoSelecionado !== "media_final";
    const colunas = mostrarDisciplinas ? colunasDisciplinas : [];

    /* =====================================================
       MONTAGEM
    ===================================================== */

    const alunos = listarAlunos(notasDaTurma);

    /* Valores de cada bimestre, calculados uma vez só */
    const valoresPorBimestre = {};
    const valoresPorDisciplina = {};

    bimestresFixos.forEach(bimestre => {
        valoresPorBimestre[bimestre] = valoresDoBimestre(notasDaTurma, bimestre);
        valoresPorDisciplina[bimestre] = valoresDaDisciplina(notasDaTurma, bimestre);
    });

    const mediaDisciplinaNoBimestre = (aluno, coluna, bimestre) =>
        calcularMedia(valoresPorDisciplina[bimestre].get(`${aluno.matricula}|${coluna.id}`) ?? []);

    const linhasDoBimestre = bimestre => alunos.map(aluno => ({
        ...aluno,
        disciplinas: colunas.map(coluna => mediaDisciplinaNoBimestre(aluno, coluna, bimestre)),
        media: calcularMedia(valoresPorBimestre[bimestre].get(aluno.matricula) ?? [])
    }));

    /* Média final = média das médias dos bimestres que têm nota */
    const linhasFinais = () => alunos.map(aluno => {

        const mediasBimestres = bimestresFixos
            .map(bimestre => calcularMedia(valoresPorBimestre[bimestre].get(aluno.matricula) ?? []))
            .filter(media => media !== null);

        const disciplinasFinais = colunas.map(coluna =>
            calcularMedia(
                bimestresFixos
                    .map(bimestre => mediaDisciplinaNoBimestre(aluno, coluna, bimestre))
                    .filter(media => media !== null)
            )
        );

        return { ...aluno, disciplinas: disciplinasFinais, media: calcularMedia(mediasBimestres) };

    });

    const blocos = [];

    if (bimestreEscolhido) {

        blocos.push(criarBloco(bimestreEscolhido, "Média do Bimestre", linhasDoBimestre(bimestreEscolhido), colunas));

    } else if (mostrarDisciplinas) {

        bimestresFixos.forEach(bimestre => {
            blocos.push(criarBloco(bimestre, "Média do Bimestre", linhasDoBimestre(bimestre), colunas));
        });

        blocos.push(criarBloco("Média Final", "Média Final", linhasFinais(), colunas));

    } else {

        /* Apenas a média final */
        blocos.push(criarBloco("Média Final", "Média Final", linhasFinais(), colunas));

    }

    resultado.replaceChildren(...blocos);

}

/* =========================================================
NOTAS
========================================================= */

async function salvarNotas() {


    try {

        const inputs = document.querySelectorAll(".input-nota:not([disabled])");

        if (inputs.length === 0) {
            popupInfo("Não há notas para salvar.");
            return;
        }

        let erros = 0;
        const mensagens = new Set();

        /* Extrai a mensagem do servidor (e o detalhe), seja qual for o formato do erro */
        const mensagemDoErro = erro => {

            const corpo = erro?.response?.data ?? erro?.response ?? erro;

            const principal = corpo?.error ?? corpo?.message ?? erro?.message ?? "";
            const detalhe = corpo?.details?.message ?? "";

            return [principal, detalhe].filter(Boolean).join(" ");

        };

        for (const input of inputs) {

            const idAdp = input.dataset.idadp;
            const idNota = input.dataset.idnota;
            const bimestre = input.dataset.bimestre;
            const valor = input.value.trim();

            /* SEM VÍNCULO ALUNO/DISCIPLINA — IGNORA */
            if (!idAdp) continue;

            /* CAMPO VAZIO — IGNORA */
            if (valor === "") continue;

            const nota = Number(valor);

            if (isNaN(nota) || nota < 0 || nota > 10) {
                erros++;
                mensagens.add("Há notas fora do intervalo de 0 a 10.");
                continue;
            }

            try {

                let resposta;

                if (idNota) {

                    /* ATUALIZAR NOTA EXISTENTE */
                    resposta = await api.put("/api/v1/notas", idNota, { nota });

                } else {

                    /* CRIAR NOVA NOTA */
                    resposta = await api.post("/api/v1/notas", {
                        idAlunoDisciplinaProfessor: Number(idAdp),
                        bimestre: bimestre,
                        nota: nota
                    });

                }

                /* Resposta de erro que não lançou exceção */
                if (resposta?.error) {
                    erros++;
                    mensagens.add(mensagemDoErro(resposta));
                }

            } catch (erroSalvar) {


                erros++;

                const mensagem = mensagemDoErro(erroSalvar);

                if (mensagem) mensagens.add(mensagem);

                /* Notas fechadas: não adianta tentar as demais */
                if (mensagem.toLowerCase().includes("fechadas")) break;

            }

        }

        if (erros > 0) {

            const motivo = [...mensagens].filter(Boolean).join("<br>");

            popupErro(
                `Algumas notas não puderam ser salvas (${erros} erro(s)).` +
                (motivo ? `<br><br>${motivo}` : "")
            );

        } else {

            popupSucesso("Notas salvas com sucesso!");

        }

        await buscarNotas();

    } catch (erro) {


        popupErro("Ocorreu um erro ao salvar as notas.");

    }

}

async function carregarNotas() {


    try {

        /* VALIDAR PROFESSOR LOGADO */
        if (!professorLogado || !professorLogado.registro) {
            popupErro("Não foi possível identificar o coordenador logado. Faça login novamente.");
            return;
        }

        const [turmas, disciplinas] = await Promise.all([
            api.get("/api/v1/turmas?todos=true"),
            api.get("/api/v1/disciplinas?lecionando=true")
        ]);

        if (!Array.isArray(turmas)) {
            popupErro("Não foi possível carregar as turmas.");
            return;
        }

        if (!Array.isArray(disciplinas)) {
            popupErro("Não foi possível carregar as disciplinas.");
            return;
        }

        /* =========================================
           REGRAS DE ACESSO

           Só aparece o que eu leciono (qualquer curso,
           inclusive o que eu coordeno).

           disciplina.professores = [{ registro, idTurma }]
        ========================================= */

        const meuRegistro = Number(professorLogado.registro);
        const cursoCoordenado = Number(professorLogado.cursoCoordenado);

        const vinculosDe = disciplina =>
            Array.isArray(disciplina.professores) ? disciplina.professores : [];

        const souProfessorDaDisciplina = disciplina =>
            vinculosDe(disciplina).some(vinculo => Number(vinculo.registro) === meuRegistro);

        const souProfessorNaTurma = (disciplina, idTurma) =>
            vinculosDe(disciplina).some(vinculo =>
                Number(vinculo.registro) === meuRegistro &&
                Number(vinculo.idTurma) === idTurma
            );

        /* Turmas em que eu leciono (de qualquer curso) */
        const idsTurmasOndeLeciono = new Set();

        disciplinas.forEach(disciplina => {
            vinculosDe(disciplina).forEach(vinculo => {
                if (Number(vinculo.registro) === meuRegistro) {
                    idsTurmasOndeLeciono.add(Number(vinculo.idTurma));
                }
            });
        });

        const disciplinasDoCurso = idCurso =>
            disciplinas.filter(disciplina =>
                Number(disciplina.Curso_idCurso) === Number(idCurso) &&
                souProfessorDaDisciplina(disciplina)
            );

        const turmasDoCurso = idCurso =>
            turmas.filter(turma =>
                Number(turma.Curso_idCurso) === Number(idCurso) &&
                idsTurmasOndeLeciono.has(Number(turma.idTurma))
            );

        /* =========================================
           CURSOS DISPONÍVEIS
           (apenas onde eu leciono)
        ========================================= */

        const idsCursos = new Set();

        disciplinas
            .filter(souProfessorDaDisciplina)
            .forEach(disciplina => idsCursos.add(Number(disciplina.Curso_idCurso)));

        const nomeDoCurso = idCurso => {

            const turma = turmas.find(t => Number(t.Curso_idCurso) === idCurso && t.nomeCurso);
            const disciplina = disciplinas.find(d => Number(d.Curso_idCurso) === idCurso && d.nomeCurso);

            return turma?.nomeCurso ?? disciplina?.nomeCurso ?? `Curso ${idCurso}`;

        };

        const cursos = [...idsCursos]
            .filter(id => Number.isInteger(id) && id > 0)
            .map(id => ({ idCurso: id, nomeCurso: nomeDoCurso(id) }))
            .sort((a, b) => a.nomeCurso.localeCompare(b.nomeCurso, "pt-BR"));


        /* Sem nenhum vínculo: não há o que lançar */
        if (cursos.length === 0) {
            popupInfo("Você não está vinculado a nenhuma disciplina para lançar notas.");
            return;
        }

        mostrarTela("tpl-consulta-notas");

        const selectCurso = document.getElementById("selectCursoNotas");
        const grupoCurso = document.getElementById("grupoCursoNotas");
        const selectTurma = document.getElementById("selectTurma");
        const selectDisciplina = document.getElementById("selectDisciplina");

        /* O select de curso só aparece se atuo em mais de um curso */
        adicionarOpcoes(selectCurso, cursos, curso => curso.idCurso, curso => curso.nomeCurso);

        grupoCurso.style.display = cursos.length > 1 ? "" : "none";

        /* Começa no curso que coordeno, se eu também leciono nele; senão, no primeiro da lista */
        const cursoInicial = cursos.some(curso => curso.idCurso === cursoCoordenado)
            ? cursoCoordenado
            : cursos[0].idCurso;

        selectCurso.value = String(cursoInicial);

        let disciplinasAtuais = [];

        function preencherTurmas(idCurso) {

            selectTurma.replaceChildren(new Option("Selecione uma turma", ""));

            adicionarOpcoes(
                selectTurma,
                turmasDoCurso(idCurso),
                turma => turma.idTurma,
                turma => turma.nomeTurma
            );

        }

        function preencherDisciplinas(lista, textoVazio) {

            selectDisciplina.replaceChildren(
                new Option(lista.length > 0 ? "Selecione uma disciplina" : textoVazio, "")
            );

            adicionarOpcoes(
                selectDisciplina,
                lista,
                disciplina => disciplina.idDisciplina,
                disciplina => disciplina.nomeDisciplina
            );

        }

        function aplicarCurso(idCurso) {

            disciplinasAtuais = disciplinasDoCurso(idCurso);

            preencherTurmas(idCurso);
            preencherDisciplinas(disciplinasAtuais, "Nenhuma disciplina disponível");

        }

        aplicarCurso(Number(selectCurso.value));

        /* Trocou o curso: refaz turmas e disciplinas e limpa a tabela */
        selectCurso.addEventListener("change", () => {

            aplicarCurso(Number(selectCurso.value));

            document.getElementById("btnSalvarNotas").style.display = "none";

            linhaVazia(
                document.getElementById("tbodyNotas"),
                4,
                "Selecione uma turma, uma disciplina e um bimestre"
            );

        });

        /* Ao escolher a turma, só mostra as disciplinas que eu leciono NESTA turma */
        selectTurma.addEventListener("change", () => {

            const turmaId = Number(selectTurma.value);
            const anterior = selectDisciplina.value;

            const lista = turmaId
                ? disciplinasAtuais.filter(disciplina =>
                    souProfessorNaTurma(disciplina, turmaId)
                )
                : disciplinasAtuais;

            preencherDisciplinas(lista, "Nenhuma disciplina para esta turma");

            if (lista.some(disciplina => String(disciplina.idDisciplina) === anterior)) {
                selectDisciplina.value = anterior;
            }

        });

        document.getElementById("btnBuscarNotas").addEventListener("click", buscarNotas);
        document.getElementById("btnSalvarNotas").addEventListener("click", salvarNotas);
        document.getElementById("btnVerContestacoes").addEventListener("click", abrirContestacoes);

    } catch (erro) {

        popupErro("Não foi possível carregar a tela de notas.");

    }

}

/* =========================================================
   BUSCAR NOTAS (lançamento — sem coluna de média final)
========================================================= */

async function buscarNotas() {


    try {

        const selectTurma = document.getElementById("selectTurma");
        const selectDisciplina = document.getElementById("selectDisciplina");
        const selectBimestre = document.getElementById("selectBimestre");

        const turmaId = Number(selectTurma.value);
        const disciplinaId = selectDisciplina.value;
        const bimestre = selectBimestre.value;

        const btnSalvar = document.getElementById("btnSalvarNotas");

        /* =========================================
           VALIDAR FILTROS
        ========================================= */

        if (!selectTurma.value || !disciplinaId || !bimestre) {
            popupInfo("Selecione uma turma, uma disciplina e um bimestre.");
            return;
        }

        if (!professorLogado || !professorLogado.registro) {
            popupErro("Professor logado não identificado.");
            return;
        }

        const meuRegistro = Number(professorLogado.registro);

        /* =========================================
           BUSCAR DADOS
        ========================================= */

        const [alunos, disciplinas, adps, notas, turmas] = await Promise.all([
            api.get("/api/v1/alunos?todos=true"),
            api.get("/api/v1/disciplinas?lecionando=true"),
            api.get("/api/v1/aluno-disciplina-professor"),
            api.get("/api/v1/notas"),
            api.get("/api/v1/turmas?todos=true")
        ]);

        if (
            !Array.isArray(alunos) ||
            !Array.isArray(disciplinas) ||
            !Array.isArray(adps) ||
            !Array.isArray(notas) ||
            !Array.isArray(turmas)
        ) {
            popupErro("Não foi possível carregar os dados das notas.");
            return;
        }

        /* =========================================
           ALUNOS DA TURMA QUE CURSAM A DISCIPLINA
           (ordem alfabética)

           Quem não tem vínculo com a disciplina escolhida
           não aparece na tabela.
        ========================================= */

        const matriculasDaDisciplina = new Set(
            adps
                .filter(adp => Number(adp.Disciplina_idDisciplina) === Number(disciplinaId))
                .map(adp => Number(adp.Aluno_matricula))
        );

        const alunosTurma = alunos
            .filter(aluno =>
                Number(aluno.Turma_idTurma) === turmaId &&
                matriculasDaDisciplina.has(Number(aluno.matricula))
            )
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));


        /* =========================================
           DISCIPLINA DADA NESTA TURMA PELO PROFESSOR LOGADO

           disciplina.professores = [{ registro, idTurma }]
           Só vale se EU leciono essa disciplina nessa turma
           e existe aluno vinculado a ela.
        ========================================= */

        const disciplinasTurma = disciplinas.filter(disciplina =>

            Number(disciplina.idDisciplina) === Number(disciplinaId) &&

            Array.isArray(disciplina.professores) &&

            disciplina.professores.some(vinculo =>
                Number(vinculo.registro) === meuRegistro &&
                Number(vinculo.idTurma) === turmaId
            ) &&

            alunosTurma.length > 0

        );

        const theadNotas = document.getElementById("theadNotas");
        const tbodyNotas = document.getElementById("tbodyNotas");

        /* =========================================
           NENHUMA DISCIPLINA / NENHUM ALUNO
        ========================================= */

        if (disciplinasTurma.length === 0) {

            theadNotas.replaceChildren(criarLinha(
                ["Matrícula", "Aluno", "Turma", "Informação"].map(titulo => criarCelula(titulo, "th"))
            ));

            linhaVazia(tbodyNotas, 4, "Nenhum aluno desta turma cursa esta disciplina com você.");

            btnSalvar.style.display = "none";

            popupInfo("Nenhum aluno desta turma cursa esta disciplina com você.");

            return;

        }

        /* Todos os bimestres: uma coluna por bimestre, todas editáveis */
        const todosBimestres = bimestre === "todos";

        const bimestresColunas = todosBimestres
            ? ["1º Bimestre", "2º Bimestre", "3º Bimestre", "4º Bimestre"]
            : [bimestre];

        /* =========================================
           CABEÇALHO (sem média final)
        ========================================= */

        const titulosCabecalho = todosBimestres
            ? ["Matrícula", "Aluno", ...bimestresColunas]
            : ["Matrícula", "Aluno", "Turma", ...disciplinasTurma.map(disciplina => disciplina.nomeDisciplina)];

        theadNotas.replaceChildren(criarLinha(
            titulosCabecalho.map(titulo => criarCelula(titulo, "th"))
        ));

        /* =========================================
           CORPO
        ========================================= */

        const linhasCorpo = [];

        alunosTurma.forEach(aluno => {

            const turma = turmas.find(t => Number(t.idTurma) === Number(aluno.Turma_idTurma));

            const celulas = [
                criarCelula(aluno.matricula),
                criarCelula(aluno.nome)
            ];

            if (!todosBimestres) {
                celulas.push(criarCelula(turma?.nomeTurma ?? "-"));
            }

            disciplinasTurma.forEach(disciplina => {

                const adp = adps.find(a =>
                    Number(a.Aluno_matricula) === Number(aluno.matricula) &&
                    Number(a.Disciplina_idDisciplina) === Number(disciplina.idDisciplina)
                );

                /* Segurança: sem vínculo não deveria chegar aqui (já filtrado) */
                if (!adp) return;

                /* Uma célula por bimestre (1 no modo normal, 4 no modo Todos) */
                bimestresColunas.forEach(bimestreColuna => {

                    const nota = notas.find(n =>
                        Number(n.idAlunoDisciplinaProfessor) === Number(adp.idAlunoDisciplinaProfessor) &&
                        normalizarBimestre(String(n.bimestre)) === normalizarBimestre(String(bimestreColuna))
                    );

                    const celula = criarElemento("tpl-celula-nota");
                    const input = celula.querySelector("input");

                    /* Arredonda para 2 casas: o banco guarda a nota como FLOAT
                       e 7.7 pode voltar como 7.6999 (ou 8.8 como 8.8000) */
                    input.value =
                        nota && nota.nota !== null && nota.nota !== ""
                            ? Number(Number(nota.nota).toFixed(2))
                            : "";
                    input.dataset.idadp = adp.idAlunoDisciplinaProfessor ?? "";
                    input.dataset.idnota = nota?.idNota ?? "";
                    input.dataset.bimestre = bimestreColuna;

                    /* Aceita vírgula (7,7): troca por ponto ao digitar,
                       para o valor lido no salvar ser sempre 7.7 */
                    if (input.type !== "number") {

                        input.inputMode = "decimal";

                        input.addEventListener("input", () => {

                            const limpo = input.value
                                .replace(",", ".")
                                .replace(/[^0-9.]/g, "");

                            if (limpo !== input.value) {
                                input.value = limpo;
                            }

                        });
                    }

                    celulas.push(celula);

                });

            });

            linhasCorpo.push(criarLinha(celulas));

        });

        tbodyNotas.replaceChildren(...linhasCorpo);

        /* =========================================
           DADOS PARA O GRÁFICO
        ========================================= */

        const adpDaTurma = adps.filter(adp =>
            alunosTurma.some(aluno => Number(aluno.matricula) === Number(adp.Aluno_matricula)) &&
            disciplinasTurma.some(disciplina => Number(disciplina.idDisciplina) === Number(adp.Disciplina_idDisciplina))
        );

        const mapaNotas = {};

        adpDaTurma.forEach(adp => {

            const idAdp = adp.idAlunoDisciplinaProfessor;

            mapaNotas[String(idAdp)] = {};

            notas
                .filter(n => Number(n.idAlunoDisciplinaProfessor) === Number(idAdp))
                .forEach(n => {
                    mapaNotas[String(idAdp)][n.bimestre] = n;
                });

        });

        atualizarGrafico(adpDaTurma, mapaNotas, bimestre);

        /* =========================================
           BOTÃO SALVAR
        ========================================= */

        btnSalvar.style.display = "block";

    } catch (erro) {

        popupErro("Não foi possível carregar as notas.");

    }

}

/* =========================================================
PROFESSORES
========================================================= */

async function salvarProfessor() {


    try {

        // =====================================================
        // PEGAR CAMPOS
        // =====================================================

        const registro = document.getElementById("registroProfessor").value.trim();
        const nome = document.getElementById("nomeProfessor").value.trim();
        const email = document.getElementById("email1").value.trim();
        const telefone = document.getElementById("telefone1").value.trim();
        const senha = document.getElementById("senhaProfessor").value.trim();

        const coordenador = document.getElementById("coordenadorProfessor").checked ? 1 : 0;

        // =====================================================
        // VALIDAÇÕES
        // =====================================================

        if (
            registro === "" ||
            nome === "" ||
            email === "" ||
            telefone === "" ||
            senha === ""
        ) {
            popupErro("Preencha todos os campos obrigatórios.");
            return;
        }

        if (!/^\d+$/.test(registro)) {
            popupErro("O registro do professor deve conter apenas números.");
            return;
        }

        if (Number(registro) <= 0) {
            popupErro("O registro do professor deve ser maior que zero.");
            return;
        }

        if (nome.length < 3) {
            popupErro("O nome do professor deve ter pelo menos 3 caracteres.");
            return;
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValido.test(email)) {
            popupErro("Informe um email válido.");
            return;
        }

        const telefoneNumeros = telefone.replace(/\D/g, "");

        if (telefoneNumeros.length < 11) {
            popupErro("Informe um telefone válido com pelo menos 11 dígitos.");
            return;
        }

        if (telefoneNumeros.length > 12) {
            popupErro("O telefone deve possuir no máximo 12 dígitos.");
            return;
        }

        if (!/^\d+$/.test(senha)) {
            popupErro("A senha deve conter apenas números.");
            return;
        }

        if (senha.length < 8) {
            popupErro("A senha deve possuir pelo menos 8 dígitos.");
            return;
        }

        if (senha.length > 100) {
            popupErro("A senha deve possuir no máximo 100 dígitos.");
            return;
        }

        // =====================================================
        // BUSCAR PROFESSORES (de todos os cursos)
        // =====================================================

        const professores = await api.get(API_PROFESSORES_TODOS);

        if (!Array.isArray(professores)) {
            popupErro("Não foi possível verificar os professores cadastrados.");
            return;
        }

        const registroExiste = professores.some(
            professor => Number(professor.registro) === Number(registro)
        );

        if (registroExiste) {
            popupErro(
                "Este professor já tem cadastro. Para ele lecionar no seu curso, " +
                "vincule-o a uma disciplina do seu curso em Disciplinas."
            );
            return;
        }

        // VERIFICAR EMAIL DUPLICADO
        const emailExiste = professores.some(
            professor =>
                professor.email1 &&
                professor.email1.trim().toLowerCase() === email.toLowerCase()
        );

        if (emailExiste) {
            popupErro("Este email já está sendo utilizado por outro professor.");
            return;
        }

        // VERIFICAR TELEFONE DUPLICADO
        const telefoneExiste = professores.some(
            professor =>
                professor.telefone1 &&
                professor.telefone1.replace(/\D/g, "") === telefoneNumeros
        );

        if (telefoneExiste) {
            popupErro("Este telefone já está sendo utilizado por outro professor.");
            return;
        }

        // =====================================================
        // MONTAR PROFESSOR
        // =====================================================

        const professor = {
            registro: Number(registro),
            nome: nome,
            email1: email,
            telefone1: telefoneNumeros,
            senha: senha,
            coordenador: coordenador
        };


        // =====================================================
        // CADASTRAR PROFESSOR
        // =====================================================

        const resposta = await api.post("/api/v1/professores", professor);


        if (!resposta) {
            popupErro("Não foi possível cadastrar o professor.");
            return;
        }

        popupSucesso("Professor cadastrado com sucesso!");

        await registrarHistoricoCoordenador(
            "Cadastro de professor",
            `Professor "${professor.nome}" (registro ${professor.registro}) cadastrado.`,
            Number(professorLogado.cursoCoordenado) 
        );

        await carregarProfessores();

    } catch (erro) {


        popupErro(erro.message || "Ocorreu um erro ao cadastrar o professor.");
    }
}

async function carregarProfessores() {


    try {

        const professores = await api.get(API_PROFESSORES);

        if (!Array.isArray(professores)) {
            popupErro("Não foi possível carregar os professores.");
            return;
        }

        mostrarTela("tpl-lista-professores");

        const tbody = document.getElementById("tbodyProfessores");

        const nomesCursos = lista =>
            (Array.isArray(lista) ? lista : [])
                .map(curso => curso.nomeCurso)
                .join(", ");

        if (professores.length === 0) {

            linhaVazia(tbody, 8, "Nenhum professor neste curso.");

        } else {

            professores.forEach(p => {

                const linha = criarElemento("tpl-linha-professor", {
                    registro: p.registro,
                    nome: p.nome,
                    email1: p.email1,
                    telefone1: p.telefone1,
                    coordena: p.nomeCursoCoordenado,
                    cursos: nomesCursos(p.cursosVinculados),
                    leciona: nomesCursos(p.cursosLeciona)
                });

                linha.querySelector(".btnEditarProfessor")
                    .addEventListener("click", () => editarProfessor(Number(p.registro)));

                linha.querySelector(".btnRemoverProfessorDoCurso")
                    .addEventListener("click", () => removerProfessorDoCurso(Number(p.registro), p.nome));

                linha.querySelector(".btnExcluirProfessor")
                    .addEventListener("click", () => excluirProfessor(Number(p.registro)));

                tbody.appendChild(linha);

            });

        }

        document.getElementById("btnNovoProfessor")
            .addEventListener("click", mostrarFormularioProfessor);

        document.getElementById("btnAdicionarProfessorExistente")
            .addEventListener("click", mostrarAdicionarProfessorExistente);

    } catch (erro) {

        popupErro("Não foi possível carregar os professores.");

    }

}


async function atualizarBadgeSolicitacoes() {

    try {

        const badge = document.getElementById("badgeSolicitacoes");

        if (!badge) return;

        const cursoCoordenado = Number(professorLogado?.cursoCoordenado);

        const lista = await api.get("/api/v1/solicitacoes-transferencia");

        const pendentes = (Array.isArray(lista) ? lista : []).filter(
            s =>
                Number(s.idCursoDestino) === cursoCoordenado &&
                s.status === "Pendente"
        ).length;

        badge.textContent = pendentes > 99 ? "99+" : String(pendentes);
        badge.style.display = pendentes > 0 ? "inline-block" : "none";

    } catch (erro) {

        // falha ao consultar o badge não deve incomodar o usuário

    }

}

var timerBadgesSolicitacoes;
var ouvinteVisibilidadeBadges;

async function atualizarBadgesSolicitacoes() {

    if (document.hidden) return;

    await atualizarBadgeSolicitacoes();

    if (typeof atualizarBadgeSolicitacoesProfessor === "function") {
        await atualizarBadgeSolicitacoesProfessor();
    }

    const badgeAdm = document.getElementById("badgeAdm");

    if (!badgeAdm) return;

    const lerBadge = id =>
        parseInt(document.getElementById(id)?.textContent, 10) || 0;

    const total =
        lerBadge("badgeSolicitacoes") +
        lerBadge("badgeSolicitacoesProfessor");

    badgeAdm.textContent = total > 99 ? "99+" : String(total);
    badgeAdm.style.display = total > 0 ? "inline-block" : "none";

}

function iniciarBadgesSolicitacoes() {

    atualizarBadgesSolicitacoes();

    clearInterval(timerBadgesSolicitacoes);

    timerBadgesSolicitacoes = setInterval(atualizarBadgesSolicitacoes, 30000);

    if (!ouvinteVisibilidadeBadges) {

        ouvinteVisibilidadeBadges = true;

        document.addEventListener("visibilitychange", atualizarBadgesSolicitacoes);

    }

}


/* =========================================================
   SOLICITAÇÕES DE TROCA DE CURSO
   (substitui a função carregarSolicitacoes atual)
========================================================= */

async function carregarSolicitacoes() {

    try {

        const cursoCoordenado = Number(professorLogado?.cursoCoordenado);

        const lista = await api.get("/api/v1/solicitacoes-transferencia");

        const solicitacoes = Array.isArray(lista) ? lista : [];

        const recebidas = solicitacoes.filter(
            s => Number(s.idCursoDestino) === cursoCoordenado
        );

        const enviadas = solicitacoes.filter(
            s => Number(s.idCursoOrigem) === cursoCoordenado
        );

        const corStatus = status =>
            status === "Aceita"
                ? "#15803d"
                : status === "Recusada"
                    ? "#b91c1c"
                    : "#b45309";

        const responder = async (s, acao) => {

            const aceitar = acao === "aceitar";

            const textoConfirma = aceitar
                ? "Aceitar a transferência deste aluno para o seu curso?"
                : "Recusar esta solicitação?";

            const tituloConfirma = aceitar
                ? "Aceitar transferência"
                : "Recusar solicitação";

            const confirmado = await popupConfirmar(textoConfirma, tituloConfirma);

            if (!confirmado) return;

            try {

                await api.post(`/api/v1/solicitacoes-transferencia/${s.idSolicitacao}/${acao}`, {});

                popupSucesso(
                    aceitar
                        ? "Aluno transferido para o seu curso."
                        : "Solicitação recusada."
                );

                const nomeAluno = s.nomeAluno ?? s.nome ?? `matrícula ${s.matricula}`;

                await registrarHistoricoCoordenador(
                    aceitar ? "Aceitação de transferência de aluno" : "Recusa de transferência de aluno",
                    `Aluno ${nomeAluno} (matrícula ${s.matricula}) ${aceitar ? "transferido para o curso" : "teve a transferência recusada para o curso"} ${s.nomeCursoDestino ?? ""}.`.replace(/\s+\./, "."),
                    Number(s.idCursoDestino)
                );

                await carregarSolicitacoes();

            } catch (erro) {


                popupErro(
                    erro.response?.error ||
                    "Não foi possível responder a solicitação."
                );

            }

        };

        mostrarTela("tpl-solicitacoes");

        const tbodyRecebidas = document.getElementById("tbodySolicitacoesRecebidas");
        const tbodyEnviadas = document.getElementById("tbodySolicitacoesEnviadas");

        /* ---------- RECEBIDAS ---------- */

        if (recebidas.length === 0) {

            linhaVazia(tbodyRecebidas, 7, "Nenhuma solicitação recebida.");

        } else {

            recebidas.forEach(s => {

                const linha = criarElemento("tpl-linha-solicitacao-recebida", {
                    ...s,
                    data: formatarData(s.dataSolicitacao)
                });

                const acoes = linha.querySelector(".acoes-pendente");
                const status = linha.querySelector(".status-solicitacao");

                if (s.status === "Pendente") {

                    status.remove();

                    acoes.querySelector(".btn-aceitar-solicitacao")
                        .addEventListener("click", () => responder(s, "aceitar"));

                    acoes.querySelector(".btn-recusar-solicitacao")
                        .addEventListener("click", () => responder(s, "recusar"));

                } else {

                    acoes.remove();

                    status.style.color = corStatus(s.status);

                }

                tbodyRecebidas.appendChild(linha);

            });

        }

        /* ---------- ENVIADAS ---------- */

        if (enviadas.length === 0) {

            linhaVazia(tbodyEnviadas, 6, "Nenhuma solicitação enviada.");

        } else {

            enviadas.forEach(s => {

                const linha = criarElemento("tpl-linha-solicitacao-enviada", {
                    ...s,
                    data: formatarData(s.dataSolicitacao)
                });

                linha.querySelector(".status-solicitacao").style.color = corStatus(s.status);

                tbodyEnviadas.appendChild(linha);

            });

        }

        /* atualiza o número do badge no menu (ex.: depois de aceitar/recusar) */
        atualizarBadgeSolicitacoes();

    } catch (erro) {


        popupErro("Não foi possível carregar as solicitações.");

    }

}

/* =========================================================
ADICIONAR PROFESSOR EXISTENTE (busca + solicitação)
========================================================= */

async function mostrarAdicionarProfessorExistente() {

    try {

        mostrarTela("tpl-adicionar-professor-existente");

        const campoBusca = document.getElementById("buscaProfessorExistente");
        const tbody = document.getElementById("tbodyProfessoresDisponiveis");

        async function buscar() {

            try {

                const termo = campoBusca.value.trim();

                const lista = await api.get(
                    `${API_PROFESSORES}/disponiveis?termo=${encodeURIComponent(termo)}`
                );

                if (!Array.isArray(lista)) {
                    popupErro("Não foi possível buscar os professores.");
                    return;
                }

                if (lista.length === 0) {

                    linhaVazia(
                        tbody,
                        6,
                        termo
                            ? "Nenhum professor encontrado para esta busca."
                            : "Nenhum professor disponível para adicionar."
                    );

                    return;

                }

                tbody.replaceChildren(...lista.map(p => {

                    const cursos = Array.isArray(p.cursos) ? p.cursos : [];

                    const linha = criarElemento("tpl-linha-professor-disponivel", {
                        registro: p.registro,
                        nome: p.nome,
                        email1: p.email1,
                        cursos: cursos.map(curso => curso.nomeCurso).join(", ")
                    });

                    const select = linha.querySelector(".selectCursoOrigem");

                    adicionarOpcoes(select, cursos, curso => curso.idCurso, curso => curso.nomeCurso);

                    /* Um curso só: já vem escolhido */
                    if (cursos.length === 1) {
                        select.value = String(cursos[0].idCurso);
                    }

                    linha.querySelector(".btnSolicitarProfessor")
                        .addEventListener("click", () => {

                            solicitarProfessorExistente(
                                p,
                                select.value,
                                select.selectedOptions[0]?.textContent || "",
                                buscar
                            );

                        });

                    return linha;

                }));

            } catch (erro) {


                popupErro("Não foi possível buscar os professores.");

            }

        }

        document.getElementById("btnBuscarProfessorExistente")
            .addEventListener("click", buscar);

        campoBusca.addEventListener("keydown", evento => {
            if (evento.key === "Enter") buscar();
        });

        document.getElementById("btnVoltarProfessores")
            .addEventListener("click", carregarProfessores);

        await buscar();

    } catch (erro) {


        popupErro("Não foi possível abrir a busca de professores.");

    }

}

async function solicitarProfessorExistente(professor, idCursoOrigem, nomeCursoOrigem, aposEnviar) {

    try {

        if (!idCursoOrigem) {
            popupErro("Selecione o curso de origem do professor.");
            return;
        }

        const confirmar = await popupConfirmar(
            `Pedir ao coordenador de <strong>${escaparHTML(nomeCursoOrigem)}</strong> ` +
            `para adicionar <strong>${escaparHTML(professor.nome)}</strong> ao seu curso?`,
            "Solicitar professor"
        );

        if (!confirmar) return;

        const resposta = await api.post(API_SOLICITACOES_PROFESSOR, {
            registroProfessor: Number(professor.registro),
            idCursoOrigem: Number(idCursoOrigem)
        });

        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Não foi possível enviar a solicitação");

            return;

        }

        popupSucesso(
            resposta?.message ||
            "Solicitação enviada ao coordenador do curso de origem."
        );

        await registrarHistoricoCoordenador(
            "Solicitação de professor",
            `Solicitado o professor ${professor.nome} (registro ${professor.registro}) ao curso ${nomeCursoOrigem}.`,
            Number(professorLogado.cursoCoordenado)
        );

        if (typeof aposEnviar === "function") await aposEnviar();

    } catch (erro) {


        popupErro(
            erro.response?.error ||
            "Não foi possível enviar a solicitação."
        );

    }

}

async function atualizarBadgeSolicitacoesProfessor() {

    try {

        const resposta = await api.get(`${API_SOLICITACOES_PROFESSOR}/pendentes/total`);

        const total = Number(resposta?.total || 0);

        const badge = document.getElementById("badgeSolicitacoesProfessor");

        if (!badge) return;

        badge.textContent = total > 9 ? "9+" : String(total);
        badge.style.display = total > 0 ? "inline-block" : "none";

    } catch (erro) {


    }

}

async function carregarSolicitacoesProfessor() {

    try {

        const cursoCoordenado = Number(professorLogado?.cursoCoordenado);

        const lista = await api.get(API_SOLICITACOES_PROFESSOR);

        const solicitacoes = Array.isArray(lista) ? lista : [];


        const normalizarStatus = status => String(status ?? "").trim().toLowerCase();

        const finalizada = s => ["aceita", "recusada"].includes(normalizarStatus(s.status));

        const recebidas = solicitacoes.filter(
            s => Number(s.idCursoOrigem) === cursoCoordenado
        );

        const enviadas = solicitacoes.filter(
            s => Number(s.idCursoDestino) === cursoCoordenado
        );

        const corStatus = status => {
            const st = normalizarStatus(status);
            return st === "aceita"
                ? "#15803d"
                : st === "recusada"
                    ? "#b91c1c"
                    : "#b45309";
        };

        const responder = async (s, acao) => {

            const aceitar = acao === "aceitar";

            const confirmado = await popupConfirmar(
                aceitar
                    ? `Aceitar que <strong>${escaparHTML(s.nomeProfessor)}</strong> também atue no curso ${escaparHTML(s.nomeCursoDestino)}?`
                    : "Recusar esta solicitação?",
                aceitar ? "Aceitar solicitação" : "Recusar solicitação"
            );

            if (!confirmado) return;

            try {

                // rotas do backend são PATCH /:id/aceitar e /:id/recusar
                const resposta = await api.patch(
                    `${API_SOLICITACOES_PROFESSOR}/${s.idSolicitacao}/${acao}`,
                    {}
                );

                if (resposta?.error) {
                    popupErro(resposta.error);
                    return;
                }

                popupSucesso(
                    aceitar
                        ? "Solicitação aceita. O professor agora faz parte do outro curso."
                        : "Solicitação recusada."
                );

                /* registrado no curso de ORIGEM, que é o de quem está respondendo */
                await registrarHistoricoCoordenador(
                    aceitar ? "Aceitação de solicitação de professor" : "Recusa de solicitação de professor",
                    `Professor ${s.nomeProfessor} (registro ${s.registroProfessor}), pedido do curso ${s.nomeCursoDestino}.`,
                    Number(s.idCursoOrigem)
                );

                await carregarSolicitacoesProfessor();

            } catch (erro) {


                popupErro(
                    erro.response?.error ||
                    "Não foi possível responder a solicitação."
                );

            }

        };

        mostrarTela("tpl-solicitacoes-professor");

        const tbodyRecebidas = document.getElementById("tbodySolicitacoesProfessorRecebidas");
        const tbodyEnviadas = document.getElementById("tbodySolicitacoesProfessorEnviadas");

        /* ---------- RECEBIDAS ---------- */

        if (recebidas.length === 0) {

            linhaVazia(tbodyRecebidas, 6, "Nenhuma solicitação recebida.");

        } else {

            recebidas.forEach(s => {

                const linha = criarElemento("tpl-linha-solicitacao-prof-recebida", {
                    ...s,
                    data: formatarData(s.dataSolicitacao)
                });

                const acoes = linha.querySelector(".acoes-pendente");
                const status = linha.querySelector(".status-solicitacao");

                if (!finalizada(s)) {

                    if (status) status.remove();

                    if (acoes) {

                        acoes.style.display = "";

                        const btnAceitar = acoes.querySelector(".btn-aceitar-solicitacao");
                        const btnRecusar = acoes.querySelector(".btn-recusar-solicitacao");

                        if (btnAceitar) btnAceitar.addEventListener("click", () => responder(s, "aceitar"));
                        if (btnRecusar) btnRecusar.addEventListener("click", () => responder(s, "recusar"));

                    }

                } else {

                    if (acoes) acoes.remove();

                    if (status) status.style.color = corStatus(s.status);

                }

                tbodyRecebidas.appendChild(linha);

            });

        }

        /* ---------- ENVIADAS ---------- */

        if (enviadas.length === 0) {

            linhaVazia(tbodyEnviadas, 5, "Nenhuma solicitação enviada.");

        } else {

            enviadas.forEach(s => {

                const linha = criarElemento("tpl-linha-solicitacao-prof-enviada", {
                    ...s,
                    data: formatarData(s.dataSolicitacao)
                });

                const status = linha.querySelector(".status-solicitacao");

                if (status) status.style.color = corStatus(s.status);

                tbodyEnviadas.appendChild(linha);

            });

        }

        atualizarBadgeSolicitacoesProfessor();

    } catch (erro) {


        popupErro("Não foi possível carregar as solicitações de professor.");

    }

}

async function mostrarFormularioProfessor() {

    try {

        mostrarTela("tpl-form-professor");

        document.getElementById("btnSalvarProfessor")
            .addEventListener("click", salvarProfessor);

        document.getElementById("btnCancelarProfessor")
            .addEventListener("click", carregarProfessores);

    } catch (erro) {


        popupErro("Não foi possível carregar o formulário de professor.");

    }

}

/* =========================================================
EDITAR PROFESSOR
========================================================= */

async function editarProfessor(registro) {

    try {

        const professor = await api.getById("/api/v1/professores", registro);

        if (!professor) {
            popupErro("Não foi possível carregar os dados do professor.");
            return;
        }

        mostrarTela("tpl-editar-professor");

        document.getElementById("editRegistroProfessor").value = professor.registro;
        document.getElementById("editNomeProfessor").value = professor.nome || "";
        document.getElementById("editEmail1").value = professor.email1 || "";
        document.getElementById("editTelefone1").value = professor.telefone1 || "";
        document.getElementById("editCoordenadorProfessor").checked = !!professor.coordenador;

        document.getElementById("btnSalvarEdicaoProfessor")
            .addEventListener("click", () => salvarEdicaoProfessor(registro));

        document.getElementById("btnCancelarEdicaoProfessor")
            .addEventListener("click", carregarProfessores);

    } catch (erro) {


        popupErro("Não foi possível carregar os dados do professor.");

    }

}

async function salvarEdicaoProfessor(registro) {


    try {

        const professorAtual = await api.getById("/api/v1/professores", registro);

        if (!professorAtual) {
            popupErro("Não foi possível carregar os dados atuais do professor.");
            return;
        }

        const nome = document.getElementById("editNomeProfessor").value.trim();
        const email1 = document.getElementById("editEmail1").value.trim();
        const telefone1 = document.getElementById("editTelefone1").value.trim();
        const senha = document.getElementById("editSenhaProfessor").value.trim();

        const coordenador = document.getElementById("editCoordenadorProfessor").checked ? 1 : 0;

        const registroFormulario = document.getElementById("editRegistroProfessor").value;

        if (Number(registroFormulario) !== Number(registro)) {
            popupErro("O registro do professor não pode ser alterado.");
            return;
        }

        if (nome === "" || email1 === "" || telefone1 === "") {
            popupErro("Nome, email e telefone são obrigatórios.");
            return;
        }

        if (nome.length < 3) {
            popupErro("O nome do professor deve ter pelo menos 3 caracteres.");
            return;
        }

        const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailValido.test(email1)) {
            popupErro("Informe um email válido.");
            return;
        }

        if (telefone1.length < 8) {
            popupErro("Informe um telefone válido.");
            return;
        }

        /* Duplicidade conferida entre professores de todos os cursos */
        const professores = await api.get(API_PROFESSORES_TODOS);

        if (!Array.isArray(professores)) {
            popupErro("Não foi possível verificar os professores cadastrados.");
            return;
        }

        const emailDuplicado = professores.some(
            professor =>
                Number(professor.registro) !== Number(registro) &&
                professor.email1 &&
                professor.email1.trim().toLowerCase() === email1.toLowerCase()
        );

        if (emailDuplicado) {
            popupErro("Este email já está sendo utilizado por outro professor.");
            return;
        }

        const telefoneDuplicado = professores.some(
            professor =>
                Number(professor.registro) !== Number(registro) &&
                professor.telefone1 &&
                professor.telefone1.trim() === telefone1
        );

        if (telefoneDuplicado) {
            popupErro("Este telefone já está sendo utilizado por outro professor.");
            return;
        }

        const dadosAlterados = {};

        if (nome !== (professorAtual.nome || "").trim()) {
            dadosAlterados.nome = nome;
        }

        if (email1 !== (professorAtual.email1 || "").trim()) {
            dadosAlterados.email1 = email1;
        }

        if (telefone1 !== (professorAtual.telefone1 || "").trim()) {
            dadosAlterados.telefone1 = telefone1;
        }

        if (Number(coordenador) !== Number(professorAtual.coordenador)) {
            dadosAlterados.coordenador = coordenador;
        }

        if (senha !== "") {

            if (!/^\d+$/.test(senha)) {
                popupErro("A nova senha deve conter apenas números.");
                return;
            }

            if (senha.length < 8) {
                popupErro("A nova senha deve possuir pelo menos 8 dígitos.");
                return;
            }

            dadosAlterados.senha = senha;

        }

        if (Object.keys(dadosAlterados).length === 0) {
            popupInfo("Nenhuma alteração foi realizada.");
            return;
        }


        const resposta = await api.put("/api/v1/professores", registro, dadosAlterados);


        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Erro ao atualizar professor");

            return;

        }

        popupSucesso(resposta?.message || "Professor atualizado com sucesso!");

        await registrarHistoricoCoordenador(
            "Edição de professor",
            `Dados do professor ${nome} atualizados.`,
            Number(professorLogado.cursoCoordenado)
        );

        await carregarProfessores();

    } catch (erro) {


        popupErro("Ocorreu um erro ao atualizar o professor.");

    }

}



/* Reúne o que as duas ações precisam saber */
async function carregarContextoProfessor(registro) {

    const dadosLogado = JSON.parse(
        sessionStorage.getItem("dadosProfessor") || "{}"
    );

    const idCursoAtual = Number(dadosLogado.cursoCoordenado);

    /* A lista do coordenador já vem com cursosVinculados (id + nome) */
    const [professores, disciplinas, adps] = await Promise.all([
        api.get("/api/v1/professores"),
        api.get("/api/v1/disciplinas"),
        api.get("/api/v1/aluno-disciplina-professor")
    ]);

    const professorAtual = Array.isArray(professores)
        ? professores.find(p => Number(p.registro) === Number(registro))
        : null;

    const cursosDoProfessor = Array.isArray(professorAtual?.cursosVinculados)
        ? professorAtual.cursosVinculados
        : [];

    /* Disciplinas que ele dá NESTE curso (as de outros cursos não contam) */
    const disciplinasVinculadas = Array.isArray(disciplinas)
        ? disciplinas.filter(
            disciplina =>
                Number(disciplina.Curso_idCurso) === idCursoAtual &&
                Array.isArray(disciplina.professores) &&
                disciplina.professores.some(
                    vinculo => Number(vinculo.registro) === Number(registro)
                )
        )
        : [];

    const idsDisciplinas = disciplinasVinculadas.map(d => Number(d.idDisciplina));

    const alunosVinculados = Array.isArray(adps)
        ? adps.filter(adp => idsDisciplinas.includes(Number(adp.Disciplina_idDisciplina)))
        : [];

    return {
        nomeProfessor: professorAtual?.nome || `registro ${registro}`,
        cursosDoProfessor,
        idCursoAtual,
        disciplinasVinculadas,
        alunosVinculados
    };
}


/* ---------------------------------------------------------
   REMOVER DO CURSO (o cadastro continua nos outros cursos)
--------------------------------------------------------- */
async function removerProfessorDoCurso(registro) {


    try {

        const ctx = await carregarContextoProfessor(registro);

        const logado = JSON.parse(sessionStorage.getItem("dadosProfessor") || "null");
        const removendoAMimMesmo = Number(registro) === Number(logado?.registro);

        /* Último curso do professor: ele ficaria sem curso */
        if (ctx.cursosDoProfessor.length <= 1) {

            popupErro(
                "Este é o único curso deste professor.<br><br>" +
                "Se ele não deve mais atuar no sistema, use <b>Excluir</b>.",
                "Professor não pode ser removido do curso"
            );

            return;
        }

        if (ctx.disciplinasVinculadas.length > 0) {

            popupErro(
                "Não é possível remover este professor do curso.<br><br>" +
                `• O professor possui ${ctx.disciplinasVinculadas.length} disciplina(s) vinculada(s) neste curso.<br>` +
                "<br>Antes, remova ou transfira esses vínculos.",
                "Professor não pode ser removido do curso"
            );

            return;
        }

        const outros = ctx.cursosDoProfessor
            .filter(c => Number(c.idCurso) !== ctx.idCursoAtual)
            .map(c => c.nomeCurso)
            .join(", ");

        const confirmar = await popupConfirmar(
            `Remover <b>${ctx.nomeProfessor}</b> do seu curso?<br><br>` +
            (outros
                ? `O cadastro dele continua existindo e ele segue em: ${outros}.`
                : "O cadastro dele continua existindo.") +
            (removendoAMimMesmo
                ? "<br><br><b>Você deixará de coordenar este curso e será desconectado.</b>"
                : "")
        );

        if (!confirmar) return;

        const resposta = await api.post(`/api/v1/professores/${registro}/remover-do-curso`, {});

        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Erro ao remover professor do curso");

            return;
        }

        await registrarHistoricoCoordenador(
            "Remoção de professor do curso",
            `Professor ${ctx.nomeProfessor} removido do curso.`,
            Number(professorLogado.cursoCoordenado)
        );

        if (removendoAMimMesmo) {

            sair();

            return;
        }

        popupSucesso(resposta?.message || "Professor removido do curso com sucesso!");

        await carregarProfessores();

    } catch (erro) {


        popupErro("Ocorreu um erro ao remover o professor do curso.");
    }
}


/* ---------------------------------------------------------
   EXCLUIR O CADASTRO (só se ele estiver apenas neste curso)
--------------------------------------------------------- */
/* Substitua a função excluirProfessor inteira do coordenador.js por esta */

async function excluirProfessor(registro) {


    try {

        const ctx = await carregarContextoProfessor(registro);

        /* Em mais de um curso: excluir apagaria o cadastro dos outros */
        if (ctx.cursosDoProfessor.length > 1) {

            popupErro(
                "Este professor também atua em outros cursos.<br><br>" +
                "Use <b>Remover do curso</b> para tirá-lo apenas do seu curso.",
                "Professor não pode ser excluído"
            );

            return;
        }

        /* Coordenador só pode ser excluído se existir OUTRO coordenador no curso */
        const logado = JSON.parse(sessionStorage.getItem("dadosProfessor") || "null");
        const meuCurso = Number(logado?.cursoCoordenado) || null;

        const lista = await api.get("/api/v1/professores");
        const professores = Array.isArray(lista) ? lista : [];

        const ehCoordDoCurso = p =>
            Number(p.coordenador) === 1 &&
            Number(p.CursoCoordenado_idCurso) === meuCurso;

        const alvo = professores.find(p => Number(p.registro) === Number(registro));

        if (alvo && ehCoordDoCurso(alvo)) {

            const existeOutro = professores.some(
                p => Number(p.registro) !== Number(registro) && ehCoordDoCurso(p)
            );

            if (!existeOutro) {

                popupErro(
                    "Este é o único coordenador do curso.<br><br>" +
                    "Cadastre outro coordenador antes de excluir este.",
                    "Professor não pode ser excluído"
                );

                return;
            }
        }

        if (ctx.disciplinasVinculadas.length > 0 || ctx.alunosVinculados.length > 0) {

            let mensagem = "Não é possível excluir este professor.<br><br>";

            if (ctx.disciplinasVinculadas.length > 0) {
                mensagem += `• O professor possui ${ctx.disciplinasVinculadas.length} disciplina(s) vinculada(s).<br>`;
            }

            if (ctx.alunosVinculados.length > 0) {
                mensagem += "• O professor possui vínculo(s) com aluno(s).<br>";
            }

            mensagem += "<br>Antes de excluir o professor, remova ou transfira esses vínculos.";

            popupErro(mensagem, "Professor não pode ser excluído");

            return;
        }

        const excluindoAMimMesmo = Number(registro) === Number(logado?.registro);

        const confirmar = await popupConfirmar(
            `Tem certeza que deseja excluir <b>${ctx.nomeProfessor}</b>?<br><br>` +
            "O cadastro será apagado definitivamente." +
            (excluindoAMimMesmo ? "<br><br><b>Este é o seu próprio cadastro: você será desconectado.</b>" : "")
        );

        if (!confirmar) return;

        const resposta = await api.delete("/api/v1/professores", registro);

        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Erro ao excluir professor");

            return;
        }

        await registrarHistoricoCoordenador(
            "Exclusão de professor",
            `Professor ${ctx.nomeProfessor} excluído.`,
            Number(professorLogado.cursoCoordenado)
        );

        if (excluindoAMimMesmo) {

            sair();

            return;
        }

        popupSucesso(resposta?.message || "Professor excluído com sucesso!");

        await carregarProfessores();

    } catch (erro) {


        popupErro("Ocorreu um erro ao excluir o professor.");
    }
}
/* =========================================================
TURMAS
========================================================= */

async function carregarTurmas() {

    try {

        const turmas = await api.get("/api/v1/turmas");


        /* CARREGAR CURSOS */
        let cursos = [];

        try {

            cursos = await api.get("/api/v1/cursos");


        } catch (erroCurso) {


        }

        mostrarTela("tpl-lista-turmas");

        /* PREENCHER FILTRO DE CURSOS */
        const selectCurso = document.getElementById("selectCursoTurma");

        /* Se a API /cursos retornar array, usamos os cursos cadastrados */
        if (Array.isArray(cursos)) {

            cursos.forEach(curso => {

                const nomeCurso = curso.nomeCurso || curso.nome || curso.curso;

                if (!nomeCurso) return;

                selectCurso.add(new Option(nomeCurso, nomeCurso));

            });

        }

        /* Se não conseguir carregar /cursos, pega os cursos das turmas */
        if (selectCurso.options.length === 1) {

            const cursosEncontrados = [];

            turmas.forEach(turma => {

                const curso = obterNomeCurso(turma);

                if (curso && !cursosEncontrados.includes(curso)) {
                    cursosEncontrados.push(curso);
                }

            });

            cursosEncontrados
                .sort()
                .forEach(curso => selectCurso.add(new Option(curso, curso)));

        }

        renderizarTabelaTurmas(turmas);

        document.getElementById("btnNovaTurma")
            .addEventListener("click", mostrarFormularioTurma);

        document.getElementById("selectAnoTurma")
            .addEventListener("change", aplicarFiltrosTurmas);

        document.getElementById("selectCursoTurma")
            .addEventListener("change", aplicarFiltrosTurmas);

        /* APLICAR FILTROS */
        function aplicarFiltrosTurmas() {

            const ano = document.getElementById("selectAnoTurma").value;
            const curso = document.getElementById("selectCursoTurma").value;

            let filtradas = [...turmas];

            /*
            FILTRO POR ANO

            1DS -> 1º Ano
            2DS -> 2º Ano
            2F  -> 2º Ano
            3ADM -> 3º Ano
            */
            if (ano) {

                filtradas = filtradas.filter(turma => {

                    const nomeTurma = String(turma.nomeTurma || "").trim();

                    return nomeTurma.startsWith(ano);

                });

            }

            /* FILTRO POR CURSO */
            if (curso) {

                filtradas = filtradas.filter(turma =>
                    obterNomeCurso(turma).toLowerCase() === curso.toLowerCase()
                );

            }

            renderizarTabelaTurmas(filtradas);

        }

    } catch (erro) {


        popupErro("Não foi possível carregar as turmas.");

    }

}

/* PEGAR NOME DO CURSO */
function obterNomeCurso(turma) {

    if (!turma) return "";

    /* Tenta vários formatos possíveis retornados pela API */
    if (typeof turma.curso === "object" && turma.curso !== null) {

        return String(turma.curso.nomeCurso || turma.curso.nome || "").trim();

    }

    return String(
        turma.nomeCurso ||
        turma.cursoNome ||
        turma.curso ||
        ""
    ).trim();

}

async function mostrarFormularioTurma() {

    document.getElementById("formTurma")
        .replaceChildren(clonarTemplate("tpl-form-turma"));

    document.getElementById("btnSalvarTurma")
        .addEventListener("click", salvarTurma);

    document.getElementById("btnCancelarTurma")
        .addEventListener("click", () => {
            document.getElementById("formTurma").replaceChildren();
        });

}

async function salvarTurma() {

    try {

        const nomeTurma = document.getElementById("nomeTurma").value.trim();

        if (nomeTurma === "") {
            popupErro("Preencha o nome da turma.");
            return;
        }

        if (nomeTurma.length < 2) {
            popupErro("O nome da turma deve ter pelo menos 2 caracteres.");
            return;
        }

        const turmas = await api.get("/api/v1/turmas");

        const nomeDuplicado =
            Array.isArray(turmas) &&
            turmas.some(
                turma =>
                    turma.nomeTurma &&
                    turma.nomeTurma.trim().toLowerCase() === nomeTurma.toLowerCase()
            );

        if (nomeDuplicado) {
            popupErro("Já existe uma turma cadastrada com este nome.");
            return;
        }

        const turma = { nomeTurma: nomeTurma };

        const resposta = await api.post("/api/v1/turmas", turma);

        if (resposta?.error) {
            popupErro(resposta.error, "Erro ao cadastrar turma");
            return;
        }

        popupSucesso(resposta?.message || "Turma cadastrada com sucesso!");

        await registrarHistoricoCoordenador(
            "Cadastro de turma",
            `Turma "${nomeTurma}" cadastrada.`,
Number(professorLogado.cursoCoordenado)        );

        await carregarTurmas();

    } catch (erro) {


        popupErro("Ocorreu um erro ao cadastrar a turma.");

    }

}

/*
==================================================
SALVAR EDIÇÃO DE TURMA (com validação de nome duplicado)
==================================================
*/

async function salvarEdicaoTurma(idTurma) {

    try {

        const nomeTurma = document.getElementById("editNomeTurma").value.trim();

        if (nomeTurma === "") {
            popupErro("Informe o nome da turma.");
            return;
        }

        if (nomeTurma.length < 2) {
            popupErro("O nome da turma deve ter pelo menos 2 caracteres.");
            return;
        }

        /* VERIFICAR NOME DUPLICADO (excluindo a própria turma) */
        const turmasExistentes = await api.get("/api/v1/turmas");

        const nomeDuplicado =
            Array.isArray(turmasExistentes) &&
            turmasExistentes.some(
                turma =>
                    Number(turma.idTurma) !== Number(idTurma) &&
                    turma.nomeTurma &&
                    turma.nomeTurma.trim().toLowerCase() === nomeTurma.toLowerCase()
            );

        if (nomeDuplicado) {
            popupErro("Já existe outra turma cadastrada com este nome.");
            return;
        }

        /*
        OBJETO ATUALIZADO
        (o curso não é enviado — permanece o curso do coordenador
        logado, travado no backend)
        */
        const dados = { nomeTurma: nomeTurma };


        const resposta = await api.put("/api/v1/turmas", idTurma, dados);

        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Erro ao atualizar turma");

            return;

        }

        popupSucesso(resposta?.message || "Turma atualizada com sucesso!");

        await registrarHistoricoCoordenador(
            "Edição de turma",
            `Turma "${nomeTurma}" atualizada.`,
            Number(professorLogado.cursoCoordenado)
        );

        await carregarTurmas();

    } catch (erro) {


        popupErro("Ocorreu um erro ao atualizar a turma.");

    }

}

/* RENDERIZAR TABELA */
function renderizarTabelaTurmas(turmas) {

    const tbody = document.querySelector("#tbodyTurmas");

    if (!tbody) return;

    if (!Array.isArray(turmas) || turmas.length === 0) {

        linhaVazia(tbody, 4, "Nenhuma turma encontrada.");

        tbody.querySelector("td").style.textAlign = "center";

        return;

    }

    tbody.replaceChildren(...turmas.map(turma => {

        const linha = criarElemento("tpl-linha-turma", {
            idTurma: turma.idTurma,
            nomeTurma: String(turma.nomeTurma || "").trim(),
            nomeCurso: obterNomeCurso(turma)
        });

        linha.querySelector(".btnEditarTurma")
            .addEventListener("click", () => editarTurma(Number(turma.idTurma)));

        linha.querySelector(".btnExcluirTurma")
            .addEventListener("click", () => deletarTurma(Number(turma.idTurma)));

        return linha;

    }));

}

/* EDITAR TURMA */
async function editarTurma(idTurma) {

    try {

        const turma = await api.getById("/api/v1/turmas", idTurma);

        if (!turma) {
            popupErro("Não foi possível carregar os dados da turma.");
            return;
        }

        document.getElementById("formTurma")
            .replaceChildren(clonarTemplate("tpl-editar-turma"));

        document.getElementById("editIdTurma").value = turma.idTurma;
        document.getElementById("editNomeTurma").value = turma.nomeTurma || "";

        document.getElementById("btnSalvarEdicaoTurma")
            .addEventListener("click", () => salvarEdicaoTurma(idTurma));

        document.getElementById("btnCancelarEdicaoTurma")
            .addEventListener("click", () => {
                document.getElementById("formTurma").replaceChildren();
            });

    } catch (erro) {


        popupErro("Não foi possível carregar a turma.");

    }

}

/* EXCLUIR TURMA */
async function deletarTurma(id) {

    try {

        const confirmar = await popupConfirmar("Deseja realmente excluir essa turma?");

        if (!confirmar) return;

        let nomeTurma = `ID ${id}`;

        try {
            const turma = await api.getById("/api/v1/turmas", id);
            if (turma?.nomeTurma) {
                nomeTurma = turma.nomeTurma;
            }
        } catch (erroBusca) {
        }

        const resposta = await api.delete("/api/v1/turmas", id);

        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Não foi possível excluir a turma");

            return;

        }

        popupSucesso(resposta?.message || "Turma excluída com sucesso!");

        await registrarHistoricoCoordenador(
            "Exclusão de turma",
            `Turma ${nomeTurma} excluída.`,
            Number(professorLogado.cursoCoordenado)
        );

        await carregarTurmas();

    } catch (erro) {


        popupErro("Ocorreu um erro ao excluir a turma.");

    }

}

/* =========================================================
   DISCIPLINAS
========================================================= */

async function carregarDisciplinas() {


    try {

        const [disciplinas, alunos, turmas, adps, professores, cursos] = await Promise.all([
            api.get("/api/v1/disciplinas"),
            api.get("/api/v1/alunos"),
            api.get("/api/v1/turmas"),
            api.get("/api/v1/aluno-disciplina-professor"),
            api.get(API_PROFESSORES_TODOS),
            api.get("/api/v1/cursos")
        ]);

        const disciplinasComSerie = disciplinas.map(disciplina => {

            const alunosDisciplina = adps
                .filter(adp => Number(adp.Disciplina_idDisciplina) === Number(disciplina.idDisciplina))
                .map(adp => alunos.find(aluno => Number(aluno.matricula) === Number(adp.Aluno_matricula)))
                .filter(Boolean);

            const series = alunosDisciplina
                .map(aluno => {

                    const turma = turmas.find(t => Number(t.idTurma) === Number(aluno.Turma_idTurma));

                    if (!turma) return null;

                    const primeiro = String(turma.nomeTurma ?? "").charAt(0);

                    return ["1", "2", "3"].includes(primeiro) ? Number(primeiro) : null;

                })
                .filter(Boolean);

            const cursoEncontrado = Array.isArray(cursos)
                ? cursos.find(c => Number(c.idCurso) === Number(disciplina.Curso_idCurso))
                : null;

            return {
                ...disciplina,
                nomeCurso: cursoEncontrado ? cursoEncontrado.nomeCurso : "-",
                serie: [...new Set(series)]
            };

        });

        mostrarTela("tpl-lista-disciplinas");

        function renderizar(lista) {

            const tbody = document.getElementById("tbodyDisciplinas");

            if (!lista || lista.length === 0) {
                linhaVazia(tbody, 5, "Nenhuma disciplina encontrada.");
                return;
            }

            tbody.replaceChildren(...lista.map(d => {

                const linha = criarElemento("tpl-linha-disciplina", {
                    idDisciplina: d.idDisciplina,
                    nomeDisciplina: d.nomeDisciplina,
                    professores: nomesProfessoresDaDisciplina(d, professores),
                    nomeCurso: d.nomeCurso
                });

                linha.querySelector(".btnEditarDisciplina")
                    .addEventListener("click", () => editarDisciplina(Number(d.idDisciplina)));

                linha.querySelector(".btnExcluirDisciplina")
                    .addEventListener("click", () => deletarDisciplina(Number(d.idDisciplina)));

                return linha;

            }));

        }

        renderizar(disciplinasComSerie);

        document.getElementById("btnNovaDisciplina")
            .addEventListener("click", mostrarFormularioDisciplina);

        document.getElementById("filtroSerieDisciplina")
            .addEventListener("change", function () {

                if (this.value === "") {
                    renderizar(disciplinasComSerie);
                    return;
                }

                renderizar(
                    disciplinasComSerie.filter(d => d.serie.includes(Number(this.value)))
                );

            });

    } catch (erro) {

        popupErro("Não foi possível carregar as disciplinas.");

    }

}

function nomesProfessoresDaDisciplina(d, professores) {

    const vinculos = Array.isArray(d.professores) ? d.professores : [];

    if (vinculos.length === 0) return "Sem professor";

    const nomes = [...new Set(
        vinculos
            .map(vinculo => {
                const professor = professores.find(p => Number(p.registro) === Number(vinculo.registro));
                return professor ? professor.nome : null;
            })
            .filter(Boolean)
    )];

    return nomes.length > 0 ? nomes.join(", ") : "Sem professor";

}

/* =========================================================
   FORMULÁRIO DE CADASTRO
========================================================= */

function professorPertenceAoCurso(professor, idCurso) {

    const curso =
        Number(idCurso);

    if (!curso) {
        return false;
    }


    /* =====================================================
       CURSO PRINCIPAL / ANTIGO
    ===================================================== */

    const cursosEncontrados = [];


    if (professor.Curso_idCurso) {

        cursosEncontrados.push(
            Number(professor.Curso_idCurso)
        );

    }


    if (professor.cursoId) {

        cursosEncontrados.push(
            Number(professor.cursoId)
        );

    }


    if (professor.CursoCoordenado_idCurso) {

        cursosEncontrados.push(
            Number(
                professor.CursoCoordenado_idCurso
            )
        );

    }


    /* =====================================================
       CURSOS VINCULADOS
    ===================================================== */

    const listas = [

        professor.cursosVinculados,

        professor.cursosLeciona,

        professor.cursos,

        professor.cursosAssociados

    ];


    listas.forEach(lista => {

        if (!Array.isArray(lista)) {
            return;
        }


        lista.forEach(item => {

            if (
                typeof item === "object" &&
                item !== null
            ) {

                const id =
                    Number(
                        item.idCurso ??
                        item.Curso_idCurso ??
                        item.id
                    );


                if (id) {
                    cursosEncontrados.push(id);
                }

            } else {

                const id =
                    Number(item);

                if (id) {
                    cursosEncontrados.push(id);
                }

            }

        });

    });


    return cursosEncontrados.includes(
        curso
    );

}


async function mostrarFormularioDisciplina() {


    try {

        // =================================================
        // DADOS DO COORDENADOR
        // =================================================

        const dadosProfessor =
            JSON.parse(
                sessionStorage.getItem(
                    "dadosProfessor"
                ) || "{}"
            );




        // =================================================
        // BUSCAR CURSOS
        //
        // Usamos /cursos somente para descobrir o nome
        // dos cursos. A lista será limitada aos cursos
        // que o coordenador administra.
        // =================================================

        const cursos =
            await api.get(
                "/api/v1/cursos"
            );


        let cursosCoordenados = [];


        // =================================================
        // NOVO FORMATO
        // =================================================

        if (
            Array.isArray(
                dadosProfessor.cursosCoordenados
            ) &&
            dadosProfessor.cursosCoordenados.length > 0
        ) {

            cursosCoordenados =
                dadosProfessor.cursosCoordenados;

        }


        // =================================================
        // FORMATO ANTIGO
        //
        // Caso o backend ainda esteja enviando somente
        // cursoCoordenado.
        // =================================================

        else if (
            dadosProfessor.cursoCoordenado
        ) {

            const idCurso =
                Number(
                    dadosProfessor.cursoCoordenado
                );


            const cursoEncontrado =
                Array.isArray(cursos)

                    ? cursos.find(
                        curso =>
                            Number(
                                curso.idCurso
                            ) === idCurso
                    )

                    : null;


            if (cursoEncontrado) {

                cursosCoordenados = [

                    {

                        idCurso:
                            cursoEncontrado.idCurso,

                        nomeCurso:
                            cursoEncontrado.nomeCurso

                    }

                ];

            }

        }




        // =================================================
        // SE NÃO HOUVER CURSOS
        // =================================================

        if (
            cursosCoordenados.length === 0
        ) {

            popupErro(
                "Você não possui cursos para administrar."
            );

            return;

        }


        // =================================================
        // BUSCAR PROFESSORES E TURMAS
        // =================================================

        const [
            professores,
            turmas
        ] = await Promise.all([

            api.get(
                API_PROFESSORES_TODOS
            ),

            api.get(
                "/api/v1/turmas"
            )

        ]);


        // =================================================
        // ABRIR FORMULÁRIO
        // =================================================

        mostrarTela(
            "tpl-form-disciplina"
        );


        const selectCurso =
            document.getElementById(
                "cursoDisciplina"
            );


        const listaProfessoresTurmas =
            document.getElementById(
                "listaProfessoresTurmas"
            );


        // =================================================
        // LIMPAR CURSOS
        // =================================================

        selectCurso.replaceChildren();


        // =================================================
        // ADICIONAR CURSOS DO COORDENADOR
        // =================================================

        cursosCoordenados.forEach(
            curso => {

                selectCurso.add(
                    new Option(
                        curso.nomeCurso,
                        curso.idCurso
                    )
                );

            }
        );


        // =================================================
        // SELECIONAR PRIMEIRO CURSO
        // =================================================

        selectCurso.value =
            String(
                cursosCoordenados[0].idCurso
            );


        // =================================================
        // NOME DA TURMA
        // =================================================

        const nomeTurma =
            turma =>

                turma.nomeTurma ??
                turma.nome ??
                turma.descricao ??
                `Turma ${turma.idTurma}`;


        // =================================================
        // RENDERIZAR PROFESSORES
        // =================================================

        function renderizarProfessores(
            idCurso
        ) {

            listaProfessoresTurmas
                .replaceChildren();


            // =============================================
            // TURMAS DO CURSO
            // =============================================

            const turmasDoCurso =
                Array.isArray(turmas)

                    ? turmas.filter(
                        turma => {

                            const idCursoTurma =
                                turma.Curso_idCurso ??
                                turma.idCurso;

                            return Number(
                                idCursoTurma
                            ) === Number(
                                idCurso
                            );

                        }
                    )

                    : [];


            // =============================================
            // PROFESSORES DO CURSO
            // =============================================

            const professoresDoCurso =
                Array.isArray(professores)

                    ? professores.filter(
                        professor =>
                            professorPertenceAoCurso(
                                professor,
                                idCurso
                            )
                    )

                    : [];




            if (
                professoresDoCurso.length === 0
            ) {

                listaProfessoresTurmas
                    .appendChild(

                        criarElemento(
                            "tpl-mensagem",
                            {
                                texto:
                                    "Nenhum professor encontrado neste curso."
                            }
                        )

                    );

                return;

            }


            // =============================================
            // PROFESSORES
            // =============================================

            professoresDoCurso.forEach(
                professor => {

                    const bloco =
                        criarElemento(
                            "tpl-bloco-professor-disciplina",
                            {

                                nome:
                                    professor.nome,

                                registro:
                                    professor.registro

                            }
                        );


                    bloco.dataset.registro =
                        professor.registro;


                    const checkProfessor =
                        bloco.querySelector(
                            ".checkProfessorDisciplina"
                        );


                    const blocoTurmas =
                        bloco.querySelector(
                            ".turmas-professor-disciplina"
                        );


                    const listaTurmas =
                        bloco.querySelector(
                            ".lista-turmas-professor"
                        );


                    checkProfessor.value =
                        professor.registro;


                    blocoTurmas.dataset.registro =
                        professor.registro;


                    // =====================================
                    // TURMAS
                    // =====================================

                    if (
                        turmasDoCurso.length > 0
                    ) {

                        turmasDoCurso.forEach(
                            turma => {

                                const opcao =
                                    criarElemento(
                                        "tpl-checkbox-turma",
                                        {
                                            nomeTurma:
                                                nomeTurma(
                                                    turma
                                                )
                                        }
                                    );


                                const check =
                                    opcao.querySelector(
                                        ".checkTurmaProfessorDisciplina"
                                    );


                                check.dataset.registro =
                                    professor.registro;


                                check.value =
                                    turma.idTurma;


                                listaTurmas
                                    .appendChild(
                                        opcao
                                    );

                            }
                        );

                    } else {

                        listaTurmas
                            .appendChild(

                                criarElemento(
                                    "tpl-mensagem",
                                    {
                                        texto:
                                            "Nenhuma turma cadastrada neste curso."
                                    }
                                )

                            );

                    }


                    // =====================================
                    // SELECIONAR PROFESSOR
                    // =====================================

                    checkProfessor
                        .addEventListener(
                            "change",
                            () => {

                                blocoTurmas.style.display =
                                    checkProfessor.checked
                                        ? "block"
                                        : "none";


                                if (
                                    !checkProfessor.checked
                                ) {

                                    blocoTurmas
                                        .querySelectorAll(
                                            ".checkTurmaProfessorDisciplina"
                                        )
                                        .forEach(
                                            checkTurma => {

                                                checkTurma.checked =
                                                    false;

                                            }
                                        );

                                }

                            }
                        );


                    listaProfessoresTurmas
                        .appendChild(
                            bloco
                        );

                }
            );

        }


        // =================================================
        // PRIMEIRO CARREGAMENTO
        // =================================================

        renderizarProfessores(
            selectCurso.value
        );


        // =================================================
        // TROCAR CURSO
        // =================================================

        selectCurso.addEventListener(
            "change",
            () => {

                renderizarProfessores(
                    selectCurso.value
                );

            }
        );


        // =================================================
        // BOTÕES
        // =================================================

        document
            .getElementById(
                "btnSalvarDisciplina"
            )
            .addEventListener(
                "click",
                salvarDisciplina
            );


        document
            .getElementById(
                "btnCancelarDisciplina"
            )
            .addEventListener(
                "click",
                carregarDisciplinas
            );


    } catch (erro) {



        popupErro(
            "Não foi possível carregar o formulário de disciplina."
        );

    }

}

function formatarDetalhesErro(details) {

    if (!details) {
        return "";
    }

    if (typeof details === "string") {
        return details;
    }

    if (details.message) {
        return String(details.message);
    }

    const itens = Array.isArray(details)
        ? details
        : Array.isArray(details.errors)
            ? details.errors
            : Object.entries(details).map(([campo, valor]) => `${campo}: ${typeof valor === "object" ? JSON.stringify(valor) : valor}`);

    return itens
        .map(item => typeof item === "object" ? (item.message || item.msg || JSON.stringify(item)) : String(item))
        .join("<br>");
}

async function salvarDisciplina() {

    try {

        const idDisciplina = document.getElementById("idDisciplina").value.trim();
        const nomeDisciplina = document.getElementById("nomeDisciplina").value.trim();
        const Curso_idCurso = document.getElementById("cursoDisciplina").value;

        /* ---------- VALIDAÇÕES BÁSICAS ---------- */

        if (!idDisciplina || Number(idDisciplina) <= 0) {
            popupErro("Informe o ID da disciplina.");
            return;
        }

        if (nomeDisciplina.length < 3) {
            popupErro("O nome da disciplina deve ter pelo menos 3 caracteres.");
            return;
        }

        if (nomeDisciplina.length > 45) {
            popupErro("O nome da disciplina não pode ultrapassar 45 caracteres.");
            return;
        }

        if (!Curso_idCurso) {
            popupErro("Selecione o curso da disciplina.");
            return;
        }

        /* ---------- PROFESSORES + TURMAS ---------- */

        const professores = [];

        const professoresSelecionados =
            document.querySelectorAll(".checkProfessorDisciplina:checked");

        if (professoresSelecionados.length === 0) {
            popupErro("Selecione pelo menos um professor.");
            return;
        }

        for (const checkboxProfessor of professoresSelecionados) {

            const registro = Number(checkboxProfessor.value);

            const turmasSelecionadas = document.querySelectorAll(
                `.checkTurmaProfessorDisciplina[data-registro="${registro}"]:checked`
            );

            if (turmasSelecionadas.length === 0) {
                popupErro(`Selecione pelo menos uma turma para o professor ${registro}.`);
                return;
            }

            turmasSelecionadas.forEach(checkboxTurma => {
                professores.push({
                    registro,
                    idTurma: Number(checkboxTurma.value)
                });
            });
        }

        /* ---------- VERIFICAR DISCIPLINAS EXISTENTES ---------- */

        const existentes = await api.get("/api/v1/disciplinas");

        if (!Array.isArray(existentes)) {
            popupErro("Não foi possível verificar as disciplinas cadastradas.");
            return;
        }

        if (existentes.some(d => Number(d.idDisciplina) === Number(idDisciplina))) {
            popupErro("Já existe uma disciplina cadastrada com este ID.");
            return;
        }

        if (existentes.some(d =>
            d.nomeDisciplina &&
            d.nomeDisciplina.trim().toLowerCase() === nomeDisciplina.toLowerCase()
        )) {
            popupErro("Já existe uma disciplina cadastrada com este nome.");
            return;
        }

        /* ---------- DADOS ---------- */

        const dados = {
            idDisciplina: Number(idDisciplina),
            nomeDisciplina,
            Curso_idCurso: Number(Curso_idCurso),
            professores
        };


        /* ---------- CADASTRAR ---------- */

        const resposta = await api.post("/api/v1/disciplinas", dados);

        popupSucesso(resposta?.message || "Disciplina cadastrada com sucesso!");

        /* ---------- HISTÓRICO ---------- */

        try {

            await registrarHistoricoCoordenador(
                "Cadastro de disciplina",
                `Disciplina "${nomeDisciplina}" cadastrada.`,
                Number(Curso_idCurso)
            );

        } catch (erroHistorico) {
        }

        await carregarDisciplinas();

    } catch (erro) {


        let mensagem = erro?.response?.error || erro?.message || "Não foi possível salvar a disciplina.";

        const detalhes = formatarDetalhesErro(erro?.response?.details);

        if (detalhes) {
            mensagem += "<br><br>" + detalhes;
        }

        popupErro(mensagem, "Erro ao cadastrar disciplina");
    }
}


/* =========================================================
   FORMULÁRIO DE EDIÇÃO
========================================================= */
async function editarDisciplina(idDisciplina) {


    try {

        const nomeTurma = turma => turma.nomeTurma ?? turma.nome ?? turma.descricao ?? `Turma ${turma.idTurma}`;

        /* Preenche um campo sem quebrar se ele não existir no template */
        function definirValor(id, valor) {

            const elemento = document.getElementById(id);

            if (!elemento) {
                return;
            }

            elemento.value = valor;

        }

        const [disciplina, professores, cursos, todasTurmas] = await Promise.all([
            api.get(`/api/v1/disciplinas/${idDisciplina}`),
            api.get(API_PROFESSORES_TODOS),
            api.get("/api/v1/cursos"),
            api.get("/api/v1/turmas")
        ]);

        if (!disciplina) {
            popupErro("Disciplina não encontrada.");
            return;
        }

        /* O curso da disciplina é fixo na edição */
        const idCursoDisciplina = Number(disciplina.Curso_idCurso);

        const cursoDaDisciplina = Array.isArray(cursos)
            ? cursos.find(curso => Number(curso.idCurso) === idCursoDisciplina)
            : null;

        const nomeCursoDaDisciplina =
            cursoDaDisciplina?.nomeCurso ??
            disciplina.nomeCurso ??
            "";

        /* Só as turmas do curso da disciplina */
        const turmas = Array.isArray(todasTurmas)
            ? todasTurmas.filter(turma => {

                const idCursoTurma = turma.Curso_idCurso ?? turma.idCurso;

                if (idCursoTurma !== undefined && idCursoTurma !== null) {
                    return Number(idCursoTurma) === idCursoDisciplina;
                }

                /* Plano B: a API só devolveu o nome do curso */
                return nomeCursoDaDisciplina !== "" &&
                    String(turma.nomeCurso ?? "").trim().toLowerCase() ===
                    nomeCursoDaDisciplina.trim().toLowerCase();

            })
            : [];

        /* Uma linha (select de turma + botão X) */
        function criarLinhaTurma(registro, idSelecionada) {

            const linha = criarElemento("tpl-linha-turma-professor");

            const select = linha.querySelector(".selectTurmaProfessorDisciplina");
            const botao = linha.querySelector(".btnExcluirTurmaProfessor");

            select.dataset.registro = registro;
            botao.dataset.registro = registro;

            adicionarOpcoes(select, turmas, turma => turma.idTurma, nomeTurma);

            if (idSelecionada) select.value = String(idSelecionada);

            return linha;

        }

        /* Container completo: linhas + botão "+ Adicionar turma" */
        function montarContainerTurmas(container, registro, idsTurmas) {

            container.replaceChildren();

            idsTurmas.forEach(id => container.appendChild(criarLinhaTurma(registro, id)));

            const botaoAdicionar = criarElemento("tpl-botao-adicionar-turma");

            botaoAdicionar.dataset.registro = registro;

            container.appendChild(botaoAdicionar);

        }

        /* Desabilita as turmas já escolhidas em OUTRO select do mesmo professor */
        function atualizarOpcoesTurmas(container) {

            if (!container) return;

            const selects = [...container.querySelectorAll(".selectTurmaProfessorDisciplina")];

            selects.forEach(select => {

                const usadasPorOutros = new Set(
                    selects
                        .filter(outro => outro !== select && outro.value !== "")
                        .map(outro => outro.value)
                );

                [...select.options].forEach(opcao => {
                    opcao.disabled = opcao.value !== "" && usadasPorOutros.has(opcao.value);
                });

            });

        }

        /* -------------------------------------------------
           VÍNCULOS ATUAIS: { registro: [idTurma, ...] }
        ------------------------------------------------- */

        const vinculos = Array.isArray(disciplina.professores) ? disciplina.professores : [];

        const turmasPorProfessor = {};

        vinculos.forEach(vinculo => {

            const registro = Number(vinculo.registro);
            const idTurma = Number(vinculo.idTurma);

            if (!Number.isInteger(registro) || registro <= 0) return;
            if (!Number.isInteger(idTurma) || idTurma <= 0) return;

            if (!turmasPorProfessor[registro]) turmasPorProfessor[registro] = [];

            if (!turmasPorProfessor[registro].includes(idTurma)) {
                turmasPorProfessor[registro].push(idTurma);
            }

        });

        mostrarTela("tpl-editar-disciplina");

        definirValor("idDisciplina", disciplina.idDisciplina);
        definirValor("nomeDisciplina", disciplina.nomeDisciplina ?? "");
        definirValor("nomeCursoDisciplina", nomeCursoDaDisciplina);

        const tbody = document.getElementById("tbodyProfessoresTurmas");

        if (!tbody) {
            throw new Error("Tabela #tbodyProfessoresTurmas não encontrada no tpl-editar-disciplina.");
        }

        /* Monta a lista de professores do curso da disciplina.
           Quem já está vinculado à disciplina aparece mesmo que
           não seja do curso (para não perder o vínculo). */
        function renderizarProfessores(estado) {

            tbody.replaceChildren();

            const lista = Array.isArray(professores)
                ? professores.filter(professor => {

                    if (estado[Number(professor.registro)]) return true;

                    return professorPertenceAoCurso(professor, idCursoDisciplina);

                })
                : [];

            if (lista.length === 0) {

                const linhaVazia = criarElemento("tpl-linha-vazia");
                const celula = linhaVazia.querySelector("td");

                celula.colSpan = 3;
                celula.textContent = "Nenhum professor encontrado neste curso.";

                tbody.appendChild(linhaVazia);

                return;

            }

            lista.forEach(professor => {

                const registro = Number(professor.registro);
                const selecionadas = estado[registro] || [];
                const marcado = selecionadas.length > 0;

                const linha = criarElemento("tpl-linha-professor-turmas", { nome: professor.nome });

                const check = linha.querySelector(".checkProfessorDisciplina");
                const container = linha.querySelector(".containerTurmasProfessor");

                check.value = registro;
                check.checked = marcado;

                container.dataset.registro = registro;

                if (marcado) montarContainerTurmas(container, registro, selecionadas);

                tbody.appendChild(linha);

            });

            /* Desabilita turmas repetidas */
            tbody.querySelectorAll(".containerTurmasProfessor").forEach(atualizarOpcoesTurmas);

        }

        renderizarProfessores(turmasPorProfessor);

        /* -------------------------------------------------
           DELEGAÇÃO: cliques (+ Adicionar turma / ×)
        ------------------------------------------------- */
        tbody.addEventListener("click", evento => {

            const botaoExcluir = evento.target.closest(".btnExcluirTurmaProfessor");
            const botaoAdicionar = evento.target.closest(".btnAdicionarTurmaProfessor");

            if (botaoExcluir) {

                const linha = botaoExcluir.closest(".linhaTurmaProfessor");
                const container = botaoExcluir.closest(".containerTurmasProfessor");

                if (!linha || !container) return;

                linha.remove();

                /* Sem nenhuma turma: desmarca o professor e limpa */
                if (container.querySelectorAll(".linhaTurmaProfessor").length === 0) {

                    container.replaceChildren();

                    const check = tbody.querySelector(
                        `.checkProfessorDisciplina[value="${container.dataset.registro}"]`
                    );

                    if (check) check.checked = false;

                } else {

                    atualizarOpcoesTurmas(container);

                }

                return;

            }

            if (botaoAdicionar) {

                const registro = Number(botaoAdicionar.dataset.registro);
                const container = botaoAdicionar.closest(".containerTurmasProfessor");

                if (!container) return;

                const selects = [...container.querySelectorAll(".selectTurmaProfessorDisciplina")];

                if (selects.some(s => s.value === "")) {
                    popupErro("Selecione a turma da linha em branco antes de adicionar outra.");
                    return;
                }

                if (selects.length >= turmas.length) {
                    popupErro("Este professor já está vinculado a todas as turmas deste curso.");
                    return;
                }

                botaoAdicionar.insertAdjacentElement("beforebegin", criarLinhaTurma(registro, ""));

                atualizarOpcoesTurmas(container);

            }

        });

        /* -------------------------------------------------
           DELEGAÇÃO: mudanças (checkbox do professor / select)
        ------------------------------------------------- */
        tbody.addEventListener("change", evento => {

            const alvo = evento.target;

            /* Marcou/desmarcou professor */
            if (alvo.matches(".checkProfessorDisciplina")) {

                const registro = Number(alvo.value);

                const container = tbody.querySelector(
                    `.containerTurmasProfessor[data-registro="${registro}"]`
                );

                if (!container) return;

                if (alvo.checked) {
                    montarContainerTurmas(container, registro, [""]);
                } else {
                    container.replaceChildren();
                }

                return;

            }

            /* Escolheu turma: bloqueia repetição */
            if (alvo.matches(".selectTurmaProfessorDisciplina")) {

                const container = alvo.closest(".containerTurmasProfessor");

                if (!container) return;

                if (alvo.value !== "") {

                    const repetida = [...container.querySelectorAll(".selectTurmaProfessorDisciplina")]
                        .some(outro => outro !== alvo && outro.value === alvo.value);

                    if (repetida) {
                        popupErro("Esta turma já foi adicionada para este professor.");
                        alvo.value = "";
                    }

                }

                atualizarOpcoesTurmas(container);

            }

        });

        document.getElementById("btnSalvarDisciplina")
            ?.addEventListener("click", () => salvarEdicaoDisciplina(idDisciplina, idCursoDisciplina));

        document.getElementById("btnCancelarDisciplina")
            ?.addEventListener("click", carregarDisciplinas);

    } catch (erro) {


        popupErro(
            erro?.response?.data?.error ||
            erro?.message ||
            "Não foi possível carregar a disciplina."
        );

    }

}

window.editarDisciplina = editarDisciplina;


/* =========================================================
   SALVAR EDIÇÃO DE DISCIPLINA (com validação de nome duplicado)
   O curso não muda na edição: vem de editarDisciplina.
========================================================= */

async function salvarEdicaoDisciplina(idDisciplina, idCurso) {


    try {

        const campoNome = document.getElementById("nomeDisciplina");

        if (!campoNome) {
            popupErro("Campo do nome da disciplina não encontrado.");
            return;
        }

        const nome = campoNome.value.trim();

        const cursoNumero = Number(idCurso);

        if (!Number.isInteger(cursoNumero) || cursoNumero <= 0) {
            popupErro("O curso da disciplina é inválido.");
            return;
        }

        /* Professores + turmas */
        const vinculos = [];
        let faltaTurma = false;
        let turmaDuplicada = false;

        const checkboxesMarcados = [...document.querySelectorAll(".checkProfessorDisciplina:checked")];

        checkboxesMarcados.forEach(checkbox => {

            const registro = Number(checkbox.value);

            const container = document.querySelector(
                `.containerTurmasProfessor[data-registro="${registro}"]`
            );

            const selects = container
                ? [...container.querySelectorAll(".selectTurmaProfessorDisciplina")]
                : [];

            if (selects.length === 0) {
                faltaTurma = true;
                return;
            }

            const vistas = new Set();

            selects.forEach(select => {

                const idTurma = Number(select.value);

                if (!Number.isInteger(idTurma) || idTurma <= 0) {
                    faltaTurma = true;
                    return;
                }

                if (vistas.has(idTurma)) {
                    turmaDuplicada = true;
                    return;
                }

                vistas.add(idTurma);

                vinculos.push({ registro, idTurma });

            });

        });

        /* Validações */
        if (nome.length < 3) {
            popupErro("O nome da disciplina deve ter pelo menos 3 caracteres.");
            return;
        }

        if (nome.length > 100) {
            popupErro("O nome da disciplina não pode ultrapassar 100 caracteres.");
            return;
        }

        if (checkboxesMarcados.length === 0) {
            popupErro("Selecione pelo menos um professor.");
            return;
        }

        if (faltaTurma) {
            popupErro("Selecione pelo menos uma turma para cada professor marcado.");
            return;
        }

        if (turmaDuplicada) {
            popupErro("Existe uma turma repetida para o mesmo professor. Remova a duplicada.");
            return;
        }

        if (vinculos.length === 0) {
            popupErro("Selecione pelo menos um professor e uma turma.");
            return;
        }

        /* Nome duplicado */
        const disciplinasExistentes = await api.get("/api/v1/disciplinas");

        if (!Array.isArray(disciplinasExistentes)) {
            popupErro("Não foi possível verificar as disciplinas cadastradas.");
            return;
        }

        const nomeDuplicado = disciplinasExistentes.some(disciplina => {

            if (Number(disciplina.idDisciplina) === Number(idDisciplina)) return false;
            if (!disciplina.nomeDisciplina) return false;

            return disciplina.nomeDisciplina.trim().toLowerCase() === nome.toLowerCase();

        });

        if (nomeDuplicado) {
            popupErro("Já existe outra disciplina cadastrada com este nome.");
            return;
        }

        const dados = {
            nomeDisciplina: nome,
            professores: vinculos,
            Curso_idCurso: cursoNumero
        };


        /* ApiService.put(uri, id, objeto) */
        const resposta = await api.put("/api/v1/disciplinas", idDisciplina, dados);

        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Erro ao atualizar disciplina");
            return;

        }

        popupSucesso(resposta?.message || "Disciplina atualizada com sucesso!");

        try {
            await registrarHistoricoCoordenador(
                "Edição de disciplina",
                `Disciplina "${nome}" atualizada.`,
                cursoNumero
            );
        } catch (erroHistorico) {
        }

        await carregarDisciplinas();

    } catch (erro) {


        popupErro(
            erro?.response?.data?.error ||
            erro?.response?.data?.message ||
            erro?.message ||
            "Ocorreu um erro ao atualizar a disciplina."
        );

    }

}
/* =========================================================
   EXCLUIR DISCIPLINA
========================================================= */

async function deletarDisciplina(idDisciplina) {

    try {

        const confirmar = await popupConfirmar("Deseja realmente excluir esta disciplina?");

        if (!confirmar) return;

        let nomeDisciplina = `ID ${idDisciplina}`;
        let idCursoDisciplina = null;

        try {

            const disciplina = await api.getById("/api/v1/disciplinas", idDisciplina);

            if (disciplina?.nomeDisciplina) nomeDisciplina = disciplina.nomeDisciplina;

            idCursoDisciplina = Number(disciplina?.Curso_idCurso) || null;

        } catch (erroBusca) {
        }

        const resposta = await api.delete("/api/v1/disciplinas", idDisciplina);

        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Não foi possível excluir a disciplina");
            return;

        }

        popupSucesso(resposta?.message || "Disciplina excluída com sucesso!");

        try {
            await registrarHistoricoCoordenador(
            "Exclusão de disciplina",
            `Disciplina ${nomeDisciplina} excluída.`,
            idCursoDisciplina
        );
        } catch (erroHistorico) {
        }

        await carregarDisciplinas();

    } catch (erro) {

        popupErro("Ocorreu um erro ao excluir a disciplina.");

    }

}

window.deletarDisciplina = deletarDisciplina;

/* =====================================================
CURSOS
===================================================== */

async function carregarCursos() {

    try {

        const cursos = await api.get("/api/v1/cursos");

        if (!Array.isArray(cursos)) {
            popupErro("Não foi possível carregar os cursos.");
            return;
        }

        mostrarTela("tpl-lista-cursos");

        renderizarTabelaCursos(cursos);

        document.getElementById("btnNovoCurso")
            .addEventListener("click", mostrarFormularioCurso);

    } catch (erro) {


        popupErro("Não foi possível carregar os cursos.");

    }

}

/* RENDERIZAR TABELA DE CURSOS */
function renderizarTabelaCursos(cursos) {

    const tbody = document.getElementById("tbodyCursos");

    if (!tbody) return;

    if (!Array.isArray(cursos) || cursos.length === 0) {

        linhaVazia(tbody, 3, "Nenhum curso cadastrado.");

        tbody.querySelector("td").style.textAlign = "center";

        return;

    }

    tbody.replaceChildren(...cursos.map(curso => {

        const linha = criarElemento("tpl-linha-curso", {
            idCurso: curso.idCurso,
            nomeCurso: curso.nomeCurso
        });

        linha.querySelector(".btnEditarCurso")
            .addEventListener("click", () => editarCurso(Number(curso.idCurso)));

        linha.querySelector(".btnExcluirCurso")
            .addEventListener("click", () => excluirCurso(Number(curso.idCurso)));

        return linha;

    }));

}

/* CADASTRAR CURSO */
function mostrarFormularioCurso() {

    document.getElementById("formCurso")
        .replaceChildren(clonarTemplate("tpl-form-curso"));

    document.getElementById("btnSalvarCurso")
        .addEventListener("click", salvarCurso);

    document.getElementById("btnCancelarCurso")
        .addEventListener("click", () => {
            document.getElementById("formCurso").replaceChildren();
        });

}

/* EDITAR CURSO */
async function editarCurso(idCurso) {

    try {

        const curso = await api.getById("/api/v1/cursos", idCurso);

        if (!curso) {
            popupErro("Não foi possível carregar os dados do curso.");
            return;
        }

        document.getElementById("formCurso")
            .replaceChildren(clonarTemplate("tpl-editar-curso"));

        document.getElementById("editIdCurso").value = curso.idCurso;
        document.getElementById("editNomeCurso").value = curso.nomeCurso || "";

        document.getElementById("btnSalvarEdicaoCurso")
            .addEventListener("click", () => salvarEdicaoCurso(idCurso, curso.nomeCurso || ""));

        document.getElementById("btnCancelarEdicaoCurso")
            .addEventListener("click", () => {
                document.getElementById("formCurso").replaceChildren();
            });

    } catch (erro) {


        popupErro("Não foi possível carregar o curso.");

    }

}

/* =========================================================
CADASTRAR CURSO (com validação de nome duplicado)
========================================================= */

async function salvarCurso() {

    const input = document.getElementById("nomeCurso");

    const nome = input?.value.trim();

    /* VALIDAÇÃO */
    if (!nome) {
        popupErro("Informe o nome do curso.");
        input?.focus();
        return;
    }

    if (nome.length < 3) {
        popupErro("O nome do curso deve ter pelo menos 3 caracteres.");
        input?.focus();
        return;
    }

    const botao = document.getElementById("btnSalvarCurso");

    try {

        if (botao) {
            botao.disabled = true;
            botao.textContent = "Salvando...";
        }

        /* VERIFICAR NOME DUPLICADO */
        const cursosExistentes = await api.get("/api/v1/cursos");

        if (!Array.isArray(cursosExistentes)) {
            popupErro("Não foi possível verificar os cursos cadastrados.");
            return;
        }

        const nomeDuplicado = cursosExistentes.some(
            curso =>
                curso.nomeCurso &&
                curso.nomeCurso.trim().toLowerCase() === nome.toLowerCase()
        );

        if (nomeDuplicado) {
            popupErro("Já existe um curso cadastrado com este nome.");
            input?.focus();
            return;
        }

        /* PAYLOAD */
        const curso = { nomeCurso: nome };


        /* POST */
        const resposta = await api.post("/api/v1/cursos", curso);


        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Erro ao cadastrar curso");

            return;
        }

        popupSucesso("Curso cadastrado com sucesso!");

        await registrarHistoricoCoordenador(
            "Cadastro de curso",
            `Curso "${nome}" cadastrado.`,
            Number(professorLogado.cursoCoordenado)
        );

        /* RECARREGA A LISTA */
        await carregarCursos();

    } catch (erro) {


        const mensagem =
            erro?.response?.data?.error ??
            erro?.response?.data?.message ??
            erro?.error ??
            erro?.message ??
            "Não foi possível cadastrar o curso.";

        popupErro(mensagem);

    } finally {

        if (botao) {
            botao.disabled = false;
            botao.textContent = "Salvar Curso";
        }

    }

}

/* =========================================================
SALVAR EDIÇÃO DE CURSO (com validação de nome duplicado)
========================================================= */

async function salvarEdicaoCurso(idCurso, nomeCursoAntigo) {

    try {

        const nomeCurso = document.getElementById("editNomeCurso").value.trim();

        if (nomeCurso === "") {
            popupErro("Informe o nome do curso.");
            return;
        }

        if (nomeCurso.length < 3) {
            popupErro("O nome do curso deve ter pelo menos 3 caracteres.");
            return;
        }

        /* VERIFICAR NOME DUPLICADO (excluindo o próprio curso) */
        const cursosExistentes = await api.get("/api/v1/cursos");

        if (!Array.isArray(cursosExistentes)) {
            popupErro("Não foi possível verificar os cursos cadastrados.");
            return;
        }

        const nomeDuplicado = cursosExistentes.some(
            curso =>
                Number(curso.idCurso) !== Number(idCurso) &&
                curso.nomeCurso &&
                curso.nomeCurso.trim().toLowerCase() === nomeCurso.toLowerCase()
        );

        if (nomeDuplicado) {
            popupErro("Já existe outro curso cadastrado com este nome.");
            return;
        }

        const resposta = await api.put("/api/v1/cursos", idCurso, { nomeCurso });

        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Erro ao atualizar curso");

            return;

        }

        popupSucesso(resposta?.message || "Curso atualizado com sucesso!");

        await registrarHistoricoCoordenador(
            "Edição de curso",
            `Curso "${nomeCursoAntigo}" atualizado para "${nomeCurso}".`,
            Number(idCurso)
        );

        await carregarCursos();

    } catch (erro) {


        popupErro("Ocorreu um erro ao atualizar o curso.");

    }

}

/* EXCLUIR CURSO */
async function excluirCurso(idCurso) {

    try {

        const confirmar = await popupConfirmar(
            "Tem certeza que deseja excluir este curso?<br><br>" +
            "O curso somente poderá ser excluído " +
            "se não houver turmas vinculadas a ele."
        );

        if (!confirmar) return;

        let nomeCurso = `ID ${idCurso}`;

        try {
            const curso = await api.getById("/api/v1/cursos", idCurso);
            if (curso?.nomeCurso) {
                nomeCurso = curso.nomeCurso;
            }
        } catch (erroBusca) {
        }

        const resposta = await api.delete("/api/v1/cursos", idCurso);

        if (resposta?.error) {

            let mensagem = resposta.error;

            if (resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Não foi possível excluir o curso");

            return;

        }

        popupSucesso(resposta?.message || "Curso excluído com sucesso!");

        await registrarHistoricoCoordenador(
            "Exclusão de curso",
            `Curso ${nomeCurso} excluído.`,
            Number(professorLogado.cursoCoordenado)
        );

        await carregarCursos();

    } catch (erro) {


        popupErro("Ocorreu um erro ao excluir o curso.");

    }

}

/* =========================================================
CARREGAR ALUNOS
========================================================= */

async function carregarAlunos() {

    try {

        /* BUSCAR ALUNOS, TURMAS, DISCIPLINAS E VÍNCULOS */
        const [alunos, turmas, disciplinas, adps] = await Promise.all([
            api.get("/api/v1/alunos"),
            api.get("/api/v1/turmas"),
            api.get(API_DISCIPLINAS),
            api.get(API_ALUNODISCIPLINAPROFESSOR)
        ]);

        if (!Array.isArray(alunos) || !Array.isArray(turmas)) {
            popupErro("Não foi possível carregar os alunos.");
            return;
        }

        alunos.sort((a, b) =>
            String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR")
        );

        turmas.sort((a, b) =>
            String(a.nomeTurma || "").localeCompare(String(b.nomeTurma || ""), "pt-BR")
        );

        mostrarTela("tpl-lista-alunos");

        adicionarOpcoes(
            document.getElementById("filtroTurmaAluno"),
            turmas,
            turma => turma.idTurma,
            turma => turma.nomeTurma
        );

        /* RENDERIZAR TABELA */
        function renderTabela(filtroTurmaId = "") {

            const tbody = document.getElementById("tbodyAlunos");
            if (!tbody) return;

            const alunosFiltrados = filtroTurmaId === ""
                ? alunos
                : alunos.filter(aluno => Number(aluno.Turma_idTurma) === Number(filtroTurmaId));

            if (alunosFiltrados.length === 0) {

                linhaVazia(tbody, 6, "Nenhum aluno encontrado para esta turma.");

                const td = tbody.querySelector("td");
                td.style.textAlign = "center";
                td.style.padding = "25px";

                return;

            }

            tbody.replaceChildren(...alunosFiltrados.map(aluno => {

                const turma = turmas.find(
                    t => Number(t.idTurma) === Number(aluno.Turma_idTurma)
                );

                /* disciplinas desse aluno */
                const nomesDisciplinas = Array.isArray(adps) && Array.isArray(disciplinas)
                    ? adps
                        .filter(adp => Number(adp.Aluno_matricula) === Number(aluno.matricula))
                        .map(adp => {
                            const d = disciplinas.find(
                                disc => Number(disc.idDisciplina) === Number(adp.Disciplina_idDisciplina)
                            );
                            return d ? d.nomeDisciplina : null;
                        })
                        .filter(Boolean)
                    : [];

                const linha = criarElemento("tpl-linha-aluno", {
                    matricula: aluno.matricula,
                    nome: aluno.nome,
                    email: aluno.email,
                    turma: turma ? turma.nomeTurma : "",
                    disciplinas: nomesDisciplinas.join(", ")
                });

                linha.querySelector(".btnEditarAluno")
                    .addEventListener("click", () => editarAluno(Number(aluno.matricula)));

                linha.querySelector(".btnExcluirAluno")
                    .addEventListener("click", () => excluirAluno(Number(aluno.matricula)));

                return linha;

            }));

        }

        renderTabela("");

        const btnBuscar = document.getElementById("btnBuscarAlunos");
        const selectTurma = document.getElementById("filtroTurmaAluno");

        if (btnBuscar && selectTurma) {
            btnBuscar.addEventListener("click", function () {
                renderTabela(selectTurma.value);
            });
        }

        const btnImportar = document.getElementById("btnImportarAluno");

        if (btnImportar) {
            btnImportar.addEventListener("click", function () {
                if (typeof window.importarAlunos === "function") {
                    window.importarAlunos();
                } else {
                    popupErro("A função de importação de alunos não está disponível.");
                }
            });
        }

        const btnCadastrarAluno = document.getElementById("btnCadastrarAluno");

        if (btnCadastrarAluno) {
            btnCadastrarAluno.addEventListener("click", mostrarFormularioCadastroAluno);
        }

        const btnLimparAlunos = document.getElementById("btnLimparAlunos");

        if (btnLimparAlunos) {
            btnLimparAlunos.addEventListener("click", abrirModalLimparAlunos);
        }

    } catch (erro) {

        popupErro("Não foi possível carregar os alunos.");

    }

}

/* =========================================================
CADASTRAR ALUNO (manual)
- O aluno entra sempre no curso que o coordenador coordena
- As disciplinas são escolhidas por checkbox
========================================================= */

async function mostrarFormularioCadastroAluno() {


    try {

        const cursoCoordenado = Number(professorLogado.cursoCoordenado);

        if (!Number.isInteger(cursoCoordenado) || cursoCoordenado <= 0) {
            popupErro("Não foi possível identificar o curso que você coordena.");
            return;
        }

        const [turmas, disciplinas] = await Promise.all([
            api.get("/api/v1/turmas"),
            api.get(API_DISCIPLINAS)
        ]);

        const turmasDoCurso = (Array.isArray(turmas) ? turmas : [])
            .filter(turma => Number(turma.Curso_idCurso) === cursoCoordenado)
            .sort((a, b) =>
                String(a.nomeTurma || "").localeCompare(String(b.nomeTurma || ""), "pt-BR")
            );

        /* Série = dígito inicial do nome da turma (ex: "3DS" -> "3") */
        const serieDaTurma = nomeTurma =>
            String(nomeTurma || "").match(/^\d+/)?.[0] || null;

        /* Cada disciplina do curso recebe as séries em que é dada
           (descobertas pelas turmas em disciplina.professores) */
        const disciplinasDoCurso = (Array.isArray(disciplinas) ? disciplinas : [])
            .filter(disciplina => Number(disciplina.Curso_idCurso) === cursoCoordenado)
            .map(disciplina => {

                const series = new Set();

                (Array.isArray(disciplina.professores) ? disciplina.professores : [])
                    .forEach(vinculo => {

                        const turma = turmasDoCurso.find(
                            t => Number(t.idTurma) === Number(vinculo.idTurma)
                        );

                        const serie = serieDaTurma(turma?.nomeTurma);

                        if (serie) series.add(serie);

                    });

                return { ...disciplina, series };

            })
            .sort((a, b) =>
                String(a.nomeDisciplina || "").localeCompare(String(b.nomeDisciplina || ""), "pt-BR")
            );

        mostrarTela("tpl-form-cadastro-aluno");

        document.getElementById("cadAnoAluno").value = new Date().getFullYear();

        const selectTurma = document.getElementById("cadTurmaAluno");
        const listaDisciplinas = document.getElementById("listaDisciplinasCadastroAluno");
        const rotuloMarcarTodas = document.getElementById("rotuloMarcarTodasDisciplinas");
        const marcarTodas = document.getElementById("cadMarcarTodasDisciplinas");

        adicionarOpcoes(selectTurma, turmasDoCurso, turma => turma.idTurma, turma => turma.nomeTurma);

        /* Mostra só as disciplinas do ano da turma escolhida */
        function renderizarDisciplinas() {

            listaDisciplinas.replaceChildren();
            marcarTodas.checked = false;
            rotuloMarcarTodas.style.display = "none";

            const turma = turmasDoCurso.find(t => Number(t.idTurma) === Number(selectTurma.value));

            if (!turma) {
                listaDisciplinas.appendChild(
                    criarElemento("tpl-mensagem", { texto: "Selecione a turma para ver as disciplinas do ano." })
                );
                return;
            }

            const serie = serieDaTurma(turma.nomeTurma);

            const doAno = disciplinasDoCurso.filter(d => !serie || d.series.has(serie));

            if (doAno.length === 0) {
                listaDisciplinas.appendChild(
                    criarElemento("tpl-mensagem", {
                        texto: `Nenhuma disciplina do ${serie || ""}º ano cadastrada neste curso.`
                    })
                );
                return;
            }

            doAno.forEach(disciplina => {

                const opcao = criarElemento("tpl-checkbox-disciplina-aluno", {
                    nomeDisciplina: disciplina.nomeDisciplina
                });

                opcao.querySelector("input").value = disciplina.idDisciplina;

                listaDisciplinas.appendChild(opcao);

            });

            rotuloMarcarTodas.style.display = "flex";

        }

        renderizarDisciplinas();

        selectTurma.addEventListener("change", renderizarDisciplinas);

        marcarTodas.addEventListener("change", () => {
            listaDisciplinas
                .querySelectorAll(".checkDisciplinaCadastroAluno")
                .forEach(check => { check.checked = marcarTodas.checked; });
        });

        listaDisciplinas.addEventListener("change", () => {
            const checks = [...listaDisciplinas.querySelectorAll(".checkDisciplinaCadastroAluno")];
            marcarTodas.checked = checks.length > 0 && checks.every(check => check.checked);
        });

        document.getElementById("btnCancelarCadastroAluno")
            .addEventListener("click", carregarAlunos);

        document.getElementById("btnSalvarCadastroAluno")
            .addEventListener("click", () => salvarCadastroAluno(cursoCoordenado));

    } catch (erro) {


        popupErro("Não foi possível carregar o formulário de cadastro de aluno.");

    }

}

async function salvarCadastroAluno(cursoCoordenado) {


    const botao = document.getElementById("btnSalvarCadastroAluno");

    const mensagemDuplicado = "Já existe um aluno cadastrado com esta matrícula ou este email.";

    const pareceDuplicado = texto => /dup|unique|já existe|ja existe|already/i.test(String(texto || ""));

    try {

        const matricula = document.getElementById("cadMatriculaAluno").value.trim();
        const nome = document.getElementById("cadNomeAluno").value.trim();
        const email = document.getElementById("cadEmailAluno").value.trim();
        const senha = document.getElementById("cadSenhaAluno").value;
        const telefone = document.getElementById("cadTelefoneAluno").value.trim();
        const turma = document.getElementById("cadTurmaAluno").value;
        const ano = document.getElementById("cadAnoAluno").value.trim();

        const checksDisciplinas = [
            ...document.querySelectorAll(".checkDisciplinaCadastroAluno")
        ];

        const idsDisciplinas = checksDisciplinas
            .filter(check => check.checked)
            .map(check => Number(check.value));

        /* VALIDAÇÕES */

        if (!/^\d+$/.test(matricula) || Number(matricula) <= 0) {
            popupErro("Informe uma matrícula válida (somente números, maior que zero).");
            return;
        }

        if (nome.length < 3) {
            popupErro("O nome do aluno deve ter pelo menos 3 caracteres.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            popupErro("Informe um email válido.");
            return;
        }

        if (senha.length < 8) {
            popupErro("A senha deve possuir pelo menos 8 caracteres.");
            return;
        }

        if (!turma) {
            popupErro("Selecione a turma do aluno.");
            return;
        }

        if (!/^\d{4}$/.test(ano)) {
            popupErro("Informe um ano válido (4 dígitos).");
            return;
        }

        /* DISCIPLINAS: obrigatório marcar todas as do ano da turma */

        if (checksDisciplinas.length === 0) {
            popupErro("Não há disciplinas cadastradas para o ano desta turma.");
            return;
        }

        if (idsDisciplinas.length !== checksDisciplinas.length) {
            popupErro("Marque todas as disciplinas do ano da turma.");
            return;
        }

        /* DUPLICIDADE (matrícula e email) */

        const emailNormalizado = email.toLowerCase();

        const alunos = await api.get("/api/v1/alunos");

        if (Array.isArray(alunos)) {

            if (alunos.some(a => Number(a.matricula) === Number(matricula))) {
                popupErro("Já existe um aluno cadastrado com esta matrícula.");
                return;
            }

            if (alunos.some(a =>
                String(a.email || "").trim().toLowerCase() === emailNormalizado
            )) {
                popupErro("Este email já está sendo utilizado por outro aluno.");
                return;
            }

        }

        if (botao) {
            botao.disabled = true;
            botao.textContent = "Cadastrando...";
        }

        /* CADASTRAR ALUNO */

        const payload = {
            matricula: Number(matricula),
            nome: nome,
            email: email,
            senha: senha,
            telefone: telefone,
            Curso_idCurso: cursoCoordenado,
            Turma_idTurma: Number(turma),
            ano: Number(ano)
        };


        const resposta = await api.post("/api/v1/alunos", payload);

        if (resposta?.error) {

            let mensagem = pareceDuplicado(resposta.error) || pareceDuplicado(resposta.details?.message)
                ? mensagemDuplicado
                : resposta.error;

            if (mensagem !== mensagemDuplicado && resposta.details?.message) {
                mensagem += "<br><br>" + resposta.details.message;
            }

            popupErro(mensagem, "Erro ao cadastrar aluno");

            return;

        }

        /* VINCULAR ÀS DISCIPLINAS */

        const falhas = [];

        for (const idDisciplina of idsDisciplinas) {

            try {

                const respostaVinculo = await api.post(API_ALUNODISCIPLINAPROFESSOR, {
                    idDisciplina: idDisciplina,
                    matricula: Number(matricula)
                });

                if (respostaVinculo?.error) {
                    falhas.push(`Disciplina ${idDisciplina}: ${respostaVinculo.error}`);
                }

            } catch (erroVinculo) {


                falhas.push(`Disciplina ${idDisciplina}: ${erroVinculo.message || "erro ao vincular"}`);

            }

        }

        await registrarHistoricoCoordenador(
            "Cadastro de aluno",
            `Aluno "${nome}" (matrícula ${matricula}) cadastrado.`,
            Number(professorLogado.cursoCoordenado)
        );

        if (falhas.length > 0) {


            popupErro(
                "O aluno foi cadastrado, mas não foi possível vincular algumas disciplinas. " +
                "Edite o aluno ou verifique o console.",
                "Cadastro parcial"
            );

        } else {

            popupSucesso("Aluno cadastrado com sucesso!");

        }

        await carregarAlunos();

    } catch (erro) {


        const textoErro = erro?.response?.error || erro?.message || "";

        popupErro(
            pareceDuplicado(textoErro)
                ? mensagemDuplicado
                : (textoErro || "Ocorreu um erro ao cadastrar o aluno.")
        );

    } finally {

        const botaoFinal = document.getElementById("btnSalvarCadastroAluno");

        if (botaoFinal) {
            botaoFinal.disabled = false;
            botaoFinal.textContent = "Cadastrar aluno";
        }

    }

}


/* =========================================================
IMPORTAR ALUNOS
========================================================= */

function importarAlunos() {

    const input = document.createElement("input");

    input.type = "file";

    input.accept = ".csv,text/csv";

    input.addEventListener("change", lerCSVAlunos);

    input.click();

}

/* =========================================================
LER CSV
========================================================= */

function lerCSVAlunos(event) {

    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    if (!arquivo.name.toLowerCase().endsWith(".csv")) {
        popupErro("Selecione um arquivo .csv válido.");
        return;
    }

    const leitor = new FileReader();

    leitor.onload = function (e) {

        try {

            const texto = e.target.result;

            const alunosCSV = converterCSVParaObjetos(texto);

            if (alunosCSV.length === 0) {
                popupErro("O arquivo CSV está vazio ou em formato inválido.");
                return;
            }

            /* GERAR SENHA A PARTIR DA DATA DE NASCIMENTO */
            const alunosComSenha = alunosCSV.map(gerarSenhaPorDataNascimento);

            const semDataNascimento = alunosComSenha.filter(aluno => !aluno.senha);

            if (semDataNascimento.length > 0) {
                popupErro(
                    `${semDataNascimento.length} aluno(s) sem data de nascimento válida no CSV. Corrija o arquivo e tente novamente.`
                );
                return;
            }

            mostrarPreviaImportacaoAlunos(alunosComSenha);

        } catch (erro) {


            popupErro("Não foi possível ler o arquivo CSV.");

        }

    };

    leitor.onerror = function () {
        popupErro("Erro ao carregar o arquivo.");
    };

    leitor.readAsText(arquivo, "UTF-8");

}

/* =========================================================
CONVERTER CSV PARA OBJETOS
Aceita:
- ;
- ,
- UTF-8 com BOM
- \n
- \r\n
========================================================= */

function converterCSVParaObjetos(texto) {

    /* REMOVER BOM */
    texto = String(texto).replace(/^\uFEFF/, "");

    /* NORMALIZAR QUEBRAS DE LINHA */
    const linhas = texto
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .filter(linha => linha.trim() !== "");

    if (linhas.length < 2) {
        return [];
    }

    /* DETECTAR DELIMITADOR */
    const primeiraLinha = linhas[0];

    const delimitador = primeiraLinha.includes(";") ? ";" : ",";

    /* CABEÇALHO */
    const cabecalho = primeiraLinha
        .split(delimitador)
        .map(coluna =>
            coluna
                .trim()
                .replace(/^"|"$/g, "")
                .toLowerCase()
        );

    const objetos = [];

    /* LINHAS */
    for (let i = 1; i < linhas.length; i++) {

        const valores = linhas[i]
            .split(delimitador)
            .map(valor => valor.trim().replace(/^"|"$/g, ""));

        const objeto = {};

        cabecalho.forEach((coluna, indice) => {
            objeto[coluna] = valores[indice] !== undefined ? valores[indice] : "";
        });

        objetos.push(objeto);

    }

    return objetos;

}

/* =========================================================
GERAR SENHA A PARTIR DA DATA DE NASCIMENTO
- Aceita a coluna vindo com nomes diferentes no CSV
    (datanascimento, data_nascimento, nascimento, etc.)
- Aceita datas em dd/mm/aaaa, dd-mm-aaaa ou aaaa-mm-dd
- Senha final: só dígitos, formato ddmmaaaa (8 dígitos)
- O hash da senha é feito no backend, igual ao cadastro manual;
    aqui só definimos o valor em texto puro que será enviado.
========================================================= */

const CHAVES_DATA_NASCIMENTO = [
    "datanascimento",
    "data_nascimento",
    "data de nascimento",
    "nascimento",
    "dtnascimento",
    "dt_nascimento"
];

function encontrarChaveDataNascimento(objeto) {

    return CHAVES_DATA_NASCIMENTO.find(
        chave => objeto[chave] !== undefined && objeto[chave] !== ""
    );

}

function normalizarDataNascimentoParaSenha(valorBruto) {

    if (!valorBruto) {
        return "";
    }

    const texto = String(valorBruto).trim();

    // dd/mm/aaaa ou dd-mm-aaaa
    let match = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);

    if (match) {

        const [, dia, mes, ano] = match;

        return dia.padStart(2, "0") + mes.padStart(2, "0") + ano;
    }

    // aaaa-mm-dd (ex: vindo de planilha/ISO)
    match = texto.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);

    if (match) {

        const [, ano, mes, dia] = match;

        return dia.padStart(2, "0") + mes.padStart(2, "0") + ano;
    }

    return "";

}

function gerarSenhaPorDataNascimento(aluno) {

    const chave = encontrarChaveDataNascimento(aluno);

    const senha = chave
        ? normalizarDataNascimentoParaSenha(aluno[chave])
        : "";

    return { ...aluno, senha };

}

/* =========================================================
PRÉ-VISUALIZAÇÃO DO CSV
========================================================= */

function mostrarPreviaImportacaoAlunos(alunosCSV) {

    /* REMOVER MODAL ANTIGO */
    document.getElementById("modalImportacaoAlunos")?.remove();

    /* CRIAR OVERLAY A PARTIR DO TEMPLATE */
    const overlay = criarElemento("tpl-modal-importacao", {
        quantidade: alunosCSV.length
    });

    const tbody = overlay.querySelector("#tbodyPreviaImportacao");

    alunosCSV.forEach(a => {

        tbody.appendChild(criarElemento("tpl-linha-previa-aluno", {
            matricula: a.matricula || "",
            nome: a.nome || "",
            email: a.email || "",
            curso: a.curso || "",
            turma: a.turma || "",
            ano: a.ano || "",
            disciplinas: a.disciplinas
        }));

    });

    document.body.appendChild(overlay);

    /* CANCELAR */
    overlay.querySelector("#btnCancelarImportacao")
        .addEventListener("click", () => overlay.remove());

    /* CONFIRMAR */
    overlay.querySelector("#btnConfirmarImportacao")
        .addEventListener("click", () => cadastrarAlunosCSV(alunosCSV));

}

/* =========================================================
CADASTRAR ALUNOS DO CSV
========================================================= */

async function cadastrarAlunosCSV(alunosCSV) {

    const btn = document.getElementById("btnConfirmarImportacao");

    try {

        if (btn) {
            btn.disabled = true;
            btn.textContent = "Importando...";
        }

        const cursos = await api.get("/api/v1/cursos");
        if (!Array.isArray(cursos)) {
            popupErro("Não foi possível carregar os cursos.");
            return;
        }

        const turmas = await api.get("/api/v1/turmas");
        if (!Array.isArray(turmas)) {
            popupErro("Não foi possível carregar as turmas.");
            return;
        }

        const disciplinas = await api.get(API_DISCIPLINAS);
        if (!Array.isArray(disciplinas)) {
            popupErro("Não foi possível carregar as disciplinas.");
            return;
        }

        let cadastrados = 0;
        let ignorados = 0;
        const erros = [];

        for (const alunoCSV of alunosCSV) {

            try {

                const matricula = Number(alunoCSV.matricula);

                /* =============================================
                VALIDAR SITUAÇÃO DO ALUNO
                O nome vem no formato "Fulano - Matriculado".
                Só importa quem estiver "Matriculado".
                ============================================= */

                const nomeCompleto = String(alunoCSV.nome || "").trim();

                const partesNome = nomeCompleto.split(" - ");

                const situacao = partesNome.length > 1
                    ? partesNome[partesNome.length - 1].trim()
                    : null;

                const nome = partesNome.length > 1
                    ? partesNome.slice(0, -1).join(" - ").trim()
                    : nomeCompleto;

                if (!situacao || situacao.toLowerCase() !== "matriculado") {
                    ignorados++;
                    erros.push(
                        `Matrícula ${alunoCSV.matricula || "desconhecida"}: aluno não está matriculado (situação: "${situacao || "não informada"}").`
                    );
                    continue;
                }

                const email = String(alunoCSV.email || "").trim();
                const telefone = String(alunoCSV.telefone || "").trim();
                const senha = String(alunoCSV.senha || "12345678").trim();
                const ano = Number(alunoCSV.ano || new Date().getFullYear());

                if (!Number.isInteger(matricula) || matricula <= 0) {
                    ignorados++;
                    erros.push(`Matrícula ${alunoCSV.matricula || "desconhecida"} inválida.`);
                    continue;
                }

                if (!nome) {
                    ignorados++;
                    erros.push(`Matrícula ${matricula}: nome não informado.`);
                    continue;
                }

                /* ENCONTRAR CURSO PELO NOME */

                const nomeCursoCSV = String(alunoCSV.curso || "")
                    .trim()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();

                const cursoEncontrado = cursos.find(curso => {
                    const nomeCursoBanco = String(curso.nomeCurso || "")
                        .trim()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase();
                    return nomeCursoBanco === nomeCursoCSV;
                });

                if (!cursoEncontrado) {
                    ignorados++;
                    erros.push(`Matrícula ${matricula}: curso "${alunoCSV.curso}" não encontrado.`);
                    continue;
                }

                const cursoId = Number(cursoEncontrado.idCurso);

                /* ENCONTRAR TURMA PELO NOME */

                const nomeTurmaCSV = String(alunoCSV.turma || "").trim().toLowerCase();

                const turmaEncontrada = turmas.find(turma => {
                    const nomeTurmaBanco = String(turma.nomeTurma || "").trim().toLowerCase();
                    return nomeTurmaBanco === nomeTurmaCSV;
                });

                if (!turmaEncontrada) {
                    ignorados++;
                    erros.push(`Matrícula ${matricula}: turma "${alunoCSV.turma}" não encontrada.`);
                    continue;
                }

                const turmaId = Number(turmaEncontrada.idTurma);

                /* =============================================
                RESOLVER DISCIPLINAS INFORMADAS NO CSV
                (só precisa achar o idDisciplina pelo nome)
                ============================================= */

                const nomesDisciplinasCSV = String(alunoCSV.disciplinas || "")
                    .split(",")
                    .map(d => d.trim())
                    .filter(d => d !== "");

                const idsDisciplinas = [];
                const disciplinasNaoEncontradas = [];

                for (const nomeDisciplinaCSV of nomesDisciplinasCSV) {

                    const nomeNormalizado = nomeDisciplinaCSV
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase();

                    const disciplinaEncontrada = disciplinas.find(d => {
                        const nomeBanco = String(d.nomeDisciplina || "")
                            .trim()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .toLowerCase();
                        return nomeBanco === nomeNormalizado;
                    });

                    if (!disciplinaEncontrada) {
                        disciplinasNaoEncontradas.push(nomeDisciplinaCSV);
                        continue;
                    }

                    idsDisciplinas.push(Number(disciplinaEncontrada.idDisciplina));
                }

                if (disciplinasNaoEncontradas.length > 0) {
                    erros.push(
                        `Matrícula ${matricula}: disciplina(s) não encontrada(s) — ${disciplinasNaoEncontradas.join(", ")}.`
                    );
                }

                /* =============================================
                CADASTRAR ALUNO
                ============================================= */

                const payload = {
                    matricula: matricula,
                    nome: nome,
                    email: email,
                    senha: senha,
                    telefone: telefone,
                    Curso_idCurso: cursoId,
                    Turma_idTurma: turmaId,
                    ano: ano
                };

                const resposta = await api.post("/api/v1/alunos", payload);

                if (resposta && resposta.error) {
                    ignorados++;
                    erros.push(`Matrícula ${matricula}: ${resposta.error}`);
                    continue;
                }

                /* =============================================
                VINCULAR ALUNO ÀS DISCIPLINAS
                ============================================= */

                for (const idDisciplina of idsDisciplinas) {

                    const vinculoPayload = {
                        idDisciplina: idDisciplina,
                        matricula: matricula
                    };

                    const respostaVinculo = await api.post(
                        API_ALUNODISCIPLINAPROFESSOR,
                        vinculoPayload
                    );

                    if (respostaVinculo && respostaVinculo.error) {
                        erros.push(
                            `Matrícula ${matricula}: aluno criado, mas não foi possível vincular à disciplina (${respostaVinculo.error}).`
                        );
                    }
                }

                cadastrados++;

            }
            catch (erroAluno) {
                ignorados++;
                erros.push(`Matrícula ${alunoCSV.matricula || "desconhecida"}: ${erroAluno.message || "Erro ao cadastrar."}`);
            }
        }

        if (cadastrados > 0) {
            popupSucesso(`${cadastrados} aluno(s) importado(s) com sucesso!`);

            await registrarHistoricoCoordenador(
                "Importação de alunos via CSV",
                `${cadastrados} aluno(s) importado(s)${ignorados > 0 ? `, ${ignorados} ignorado(s)` : ""}.`,
                Number(professorLogado.cursoCoordenado)
            );

        } else {
            popupInfo("Nenhum aluno foi importado.");
        }

        if (erros.length > 0) {
        }

        document.getElementById("modalImportacaoAlunos")?.remove();

        if (typeof atualizarBadgeHistorico === "function") {
            atualizarBadgeHistorico();
        }

        await carregarAlunos();

    }
    catch (erro) {
        popupErro("Não foi possível concluir a importação.");
    }
    finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Importar alunos";
        }
    }
}

/* =========================================================
EDITAR ALUNO (com validação de email duplicado e disciplinas)
========================================================= */

const ROTAS_DISC = {
    todas: "/api/v1/disciplinas",
    doAluno: matricula => `/api/v1/alunos/${matricula}/disciplinas`,
    salvar: "/api/v1/alunos/disciplinas"
};


/* =========================================================
   MENSAGEM DE ERRO DA API
   (serve para resposta com "error" e para erro lançado)
   comHtml = true junta o detalhe com <br> (para popupErro);
   false devolve só uma frase (para mostrar dentro do modal).
========================================================= */

function mensagemErroApi(origem, padrao, comHtml = true) {

    const dados = origem?.response ?? origem;

    const detalhe = dados?.details?.message;

    if (!comHtml) {

        if (detalhe) return detalhe;
        if (dados?.error) return dados.error;
        if (/401/.test(String(origem?.message))) return "Senha incorreta. Tente novamente.";

        return padrao;
    }

    let mensagem = dados?.error || origem?.message || padrao;

    if (detalhe) {
        mensagem += "<br><br>" + detalhe;
    }

    return mensagem;
}


/* =========================================================
   MODAL: EXCLUIR ALUNO COM NOTAS (pede a senha do coordenador)

   Mesmo comportamento do modal de limpar alunos: Enter
   confirma, o botão fica bloqueado enquanto envia e, se a
   senha estiver errada, o erro aparece dentro do modal e ele
   continua aberto.

   Devolve a resposta da API se excluiu, ou null se cancelou.
========================================================= */

function abrirModalExcluirAlunoComNotas(matricula, nomeAluno, qtdDisciplinas = 0) {

    return new Promise(resolve => {

        document.getElementById("modalExcluirAlunoComNotas")?.remove();

        const overlay = document.createElement("div");
        overlay.id = "modalExcluirAlunoComNotas";
        overlay.style.cssText =
            "position:fixed;inset:0;background:rgba(0,0,0,.5);" +
            "display:flex;align-items:center;justify-content:center;z-index:10000;";

        const caixa = document.createElement("div");
        caixa.style.cssText =
            "background:#fff;border-radius:12px;padding:24px;max-width:440px;" +
            "width:90%;box-shadow:0 10px 30px rgba(0,0,0,.3);";

        const titulo = document.createElement("h3");
        titulo.textContent = "Aluno com notas lançadas";
        titulo.style.cssText = "margin:0 0 12px 0;color:#b91c1c;";

        const texto = document.createElement("p");
        texto.textContent =
            `${nomeAluno} possui notas lançadas` +
            (qtdDisciplinas > 0 ? ` em ${qtdDisciplinas} disciplina(s)` : "") +
            ". Se excluir mesmo assim, as notas, " +
            "contestações e vínculos com disciplinas dele serão apagados " +
            "definitivamente. Para continuar, digite a sua senha de coordenador.";
        texto.style.cssText = "margin:0 0 14px 0;line-height:1.4;";

        const campo = document.createElement("input");
        campo.type = "password";
        campo.placeholder = "Sua senha";
        campo.autocomplete = "current-password";
        campo.style.cssText =
            "width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;" +
            "border-radius:8px;font-size:14px;";

        const erro = document.createElement("div");
        erro.style.cssText = "color:#b91c1c;font-size:13px;min-height:18px;margin-top:6px;";

        const acoes = document.createElement("div");
        acoes.style.cssText =
            "display:flex;justify-content:flex-end;gap:10px;margin-top:14px;";

        const btnCancelar = document.createElement("button");
        btnCancelar.type = "button";
        btnCancelar.textContent = "Cancelar";
        btnCancelar.style.cssText =
            "padding:9px 16px;border:1px solid #ccc;background:#f3f4f6;" +
            "border-radius:8px;cursor:pointer;";

        const btnConfirmar = document.createElement("button");
        btnConfirmar.type = "button";
        btnConfirmar.textContent = "Excluir mesmo assim";
        btnConfirmar.style.cssText =
            "padding:9px 16px;border:none;background:#dc2626;color:#fff;" +
            "border-radius:8px;cursor:pointer;";

        const cancelar = () => {
            overlay.remove();
            resolve(null);
        };

        const confirmar = async () => {

            erro.textContent = "";

            if (campo.value.trim() === "") {
                erro.textContent = "Digite a sua senha de coordenador.";
                campo.focus();
                return;
            }

            btnConfirmar.disabled = true;
            btnConfirmar.textContent = "Excluindo...";

            try {

                const resposta = await api.post(
                    `/api/v1/alunos/${encodeURIComponent(matricula)}/excluir-com-notas`,
                    { senha: campo.value }
                );

                if (!resposta || resposta.error) {
                    throw { response: resposta };
                }

                overlay.remove();
                resolve(resposta);

            } catch (erroApi) {

                btnConfirmar.disabled = false;
                btnConfirmar.textContent = "Excluir mesmo assim";

                erro.textContent = mensagemErroApi(
                    erroApi,
                    "Não foi possível excluir o aluno. Tente novamente.",
                    false
                );

                campo.value = "";
                campo.focus();
            }
        };

        btnCancelar.addEventListener("click", cancelar);
        btnConfirmar.addEventListener("click", confirmar);

        campo.addEventListener("keydown", evento => {
            if (evento.key === "Enter") {
                confirmar();
            }
        });

        overlay.addEventListener("click", evento => {
            if (evento.target === overlay) {
                cancelar();
            }
        });

        acoes.append(btnCancelar, btnConfirmar);
        caixa.append(titulo, texto, campo, erro, acoes);
        overlay.appendChild(caixa);
        document.body.appendChild(overlay);

        setTimeout(() => campo.focus(), 50);
    });
}

/* =========================================================
   EDITAR ALUNO
   (substitui a função editarAluno atual do coordenador.js)

   Histórico: mostra o aluno, a turma e exatamente o que mudou
   (nome, email, telefone, ano, turma, senha redefinida e
   disciplinas adicionadas/removidas). A senha NUNCA vai para
   o texto do histórico, só o aviso de que foi redefinida.
========================================================= */

async function editarAluno(matricula) {

    try {

        const [alunos, cursos, turmas, notas, disciplinas, discAluno] = await Promise.all([
            api.get("/api/v1/alunos"),
            api.get("/api/v1/cursos"),
            api.get("/api/v1/turmas?todos=true"),
            api.get("/api/v1/notas"),
            api.get(ROTAS_DISC.todas),
            api.get(ROTAS_DISC.doAluno(matricula)).catch(() => null)
        ]);

        if (!Array.isArray(alunos)) {
            popupErro("Não foi possível carregar os alunos.");
            return;
        }

        const aluno = alunos.find(a => Number(a.matricula) === Number(matricula));

        if (!aluno) {
            popupErro("Aluno não encontrado.");
            return;
        }

        const listaCursos = Array.isArray(cursos) ? cursos : [];
        const listaTurmas = Array.isArray(turmas) ? turmas : [];
        const listaDisciplinas = Array.isArray(disciplinas) ? disciplinas : [];

        /* nomes para o histórico */

        const nomeTurmaPorId = id =>
            listaTurmas.find(t => Number(t.idTurma) === Number(id))?.nomeTurma
            ?? ("turma " + id);

        const nomeDisciplinaPorId = id => {
            const d = listaDisciplinas.find(x => Number(x.idDisciplina) === Number(id));
            return d?.nomeDisciplina ?? d?.nome ?? ("Disciplina " + id);
        };

        /* =====================================================
        DISCIPLINAS DO ALUNO (vêm do servidor)
        discAluno = { disciplinas: [ids], comNota: [ids] }
        ===================================================== */

        const idsDisciplinasAluno = new Set(
            (discAluno?.disciplinas || []).map(Number)
        );

        // disciplinas em que o aluno já tem nota (ficam travadas)
        const disciplinasComNota = new Set(
            (discAluno?.comNota || []).map(Number)
        );

        const alunoTemNotas =
            Array.isArray(notas) &&
            notas.some(nota => {

                const matriculaNota = String(
                    nota.matricula ??
                    nota.Aluno_matricula ??
                    ""
                ).trim();

                const valor = nota.nota ?? nota.valor ?? nota.notaFinal;

                return (
                    matriculaNota === String(aluno.matricula) &&
                    valor !== null &&
                    valor !== undefined &&
                    valor !== ""
                );
            });

        /* =====================================================
        SÉRIE DA TURMA ATUAL
        (dígito inicial do nome da turma, ex: "3DS" -> "3")
        ===================================================== */

        const serieDaTurma = nomeTurma =>
            String(nomeTurma || "").match(/^\d+/)?.[0] || null;

        const turmaAtualObj = listaTurmas.find(
            t => Number(t.idTurma) === Number(aluno.Turma_idTurma)
        );

        const serieAtual = serieDaTurma(turmaAtualObj?.nomeTurma);

        mostrarTela("tpl-editar-aluno");

        document.getElementById("matriculaAluno").value = aluno.matricula;
        document.getElementById("nomeAluno").value = aluno.nome || "";
        document.getElementById("emailAluno").value = aluno.email || "";
        document.getElementById("telefoneAluno").value = aluno.telefone || "";
        document.getElementById("anoAluno").value = aluno.ano || "";

        const selectCurso = document.getElementById("cursoAluno");
        const selectTurma = document.getElementById("turmaAluno");
        const avisoCurso = document.getElementById("avisoCursoAluno");

        /* =====================================================
        CURSOS
        ===================================================== */

        adicionarOpcoes(selectCurso, listaCursos, c => c.idCurso, c => c.nomeCurso);

        selectCurso.value = aluno.Curso_idCurso;

        selectCurso.disabled = alunoTemNotas;

        avisoCurso.textContent = alunoTemNotas
            ? "Este aluno já possui notas lançadas, então o curso não pode ser alterado."
            : "";

        /* =====================================================
        DISCIPLINAS (criadas aqui, não precisa mexer no template)
        ===================================================== */

        let boxDisciplinas = document.getElementById("disciplinasAluno");

        if (!boxDisciplinas) {
            boxDisciplinas = document.createElement("div");
            boxDisciplinas.id = "disciplinasAluno";
            boxDisciplinas.style.margin = "12px 0";
            avisoCurso.insertAdjacentElement("afterend", boxDisciplinas);
        }

        const disciplinasDoCurso = listaDisciplinas.filter(
            d => Number(d.Curso_idCurso) === Number(aluno.Curso_idCurso)
        );

        function desenharDisciplinas() {

            boxDisciplinas.replaceChildren();

            const titulo = document.createElement("strong");
            titulo.textContent = "Disciplinas";
            boxDisciplinas.appendChild(titulo);

            if (!discAluno) {
                const erro = document.createElement("p");
                erro.textContent = "Não foi possível carregar as disciplinas do aluno.";
                boxDisciplinas.appendChild(erro);
                return;
            }

            if (disciplinasDoCurso.length === 0) {
                const vazio = document.createElement("p");
                vazio.textContent = "Nenhuma disciplina cadastrada para este curso.";
                boxDisciplinas.appendChild(vazio);
                return;
            }

            disciplinasDoCurso.forEach(d => {

                const id = Number(d.idDisciplina);
                const travada = disciplinasComNota.has(id);

                const label = document.createElement("label");
                label.style.display = "block";

                const check = document.createElement("input");
                check.type = "checkbox";
                check.className = "check-disciplina-aluno";
                check.value = id;
                check.checked = idsDisciplinasAluno.has(id);
                check.disabled = travada;

                label.appendChild(check);
                label.appendChild(document.createTextNode(
                    " " + (d.nomeDisciplina ?? d.nome ?? ("Disciplina " + id)) +
                    (travada ? " (possui notas, não pode ser alterada)" : "")
                ));

                boxDisciplinas.appendChild(label);

            });

        }

        desenharDisciplinas();

        /* =====================================================
        TURMAS (do curso escolhido, mesma série)
        ===================================================== */

        function preencherOpcoesTurma(idCurso, turmaSelecionada) {

            const disponiveis = listaTurmas.filter(t => {

                const mesmoCurso = Number(t.Curso_idCurso) === Number(idCurso);

                const mesmaSerie =
                    !serieAtual ||
                    serieDaTurma(t.nomeTurma) === serieAtual;

                return mesmoCurso && mesmaSerie;

            });

            selectTurma.replaceChildren();

            if (disponiveis.length === 0) {
                selectTurma.add(new Option("Nenhuma turma disponível", ""));
                return;
            }

            if (Number(idCurso) !== Number(aluno.Curso_idCurso)) {
                selectTurma.add(new Option("Selecione a turma", ""));
            }

            adicionarOpcoes(selectTurma, disponiveis, t => t.idTurma, t => t.nomeTurma);

            if (disponiveis.some(t => Number(t.idTurma) === Number(turmaSelecionada))) {
                selectTurma.value = String(turmaSelecionada);
            }

        }

        preencherOpcoesTurma(aluno.Curso_idCurso, aluno.Turma_idTurma);

        /* =====================================================
        AO ESCOLHER OUTRO CURSO, MOSTRA SÓ AS TURMAS DELE
        (as disciplinas ficam bloqueadas até a troca ser aceita)
        ===================================================== */

        selectCurso.addEventListener("change", () => {

            const cursoEscolhido = Number(selectCurso.value);

            const mudouCurso = cursoEscolhido !== Number(aluno.Curso_idCurso);

            preencherOpcoesTurma(cursoEscolhido, aluno.Turma_idTurma);

            boxDisciplinas.querySelectorAll(".check-disciplina-aluno").forEach(c => {
                c.disabled = mudouCurso || disciplinasComNota.has(Number(c.value));
            });

            avisoCurso.textContent = mudouCurso
                ? "A troca de curso não é feita na hora: será enviada uma solicitação ao coordenador do outro curso, e o aluno só muda depois que ele aceitar."
                : "";

        });

        /* =====================================================
        CANCELAR
        ===================================================== */

        document.getElementById("btnCancelarAluno")
            .addEventListener("click", carregarAlunos);

        /* =====================================================
        SALVAR
        ===================================================== */

        document.getElementById("btnSalvarAluno").addEventListener("click", async () => {

            try {

                const nome = document.getElementById("nomeAluno").value.trim();
                const email = document.getElementById("emailAluno").value.trim();
                const telefone = document.getElementById("telefoneAluno").value.trim();
                const anoNovo = String(document.getElementById("anoAluno").value || "").trim();
                const senhaDigitada = document.getElementById("senhaAluno").value;

                const cursoEscolhido = Number(selectCurso.value);

                const pedidoTrocaCurso =
                    !alunoTemNotas &&
                    cursoEscolhido !== Number(aluno.Curso_idCurso);

                if (nome.length < 3) {
                    popupErro("O nome do aluno deve ter pelo menos 3 caracteres.");
                    return;
                }

                if (email === "") {
                    popupErro("Informe o email do aluno.");
                    return;
                }

                if (pedidoTrocaCurso && !selectTurma.value) {
                    popupErro("Selecione a turma de destino no outro curso.");
                    return;
                }

                /* =========================================
                VERIFICAR EMAIL DUPLICADO
                ========================================= */

                const emailDuplicado = alunos.some(
                    a =>
                        Number(a.matricula) !== Number(matricula) &&
                        a.email &&
                        a.email.trim().toLowerCase() === email.toLowerCase()
                );

                if (emailDuplicado) {
                    popupErro("Este email já está sendo utilizado por outro aluno.");
                    return;
                }

                /* =========================================
                DISCIPLINAS MARCADAS
                (as travadas entram sempre, mesmo desmarcadas na tela)
                ========================================= */

                const disciplinasSelecionadas = new Set(disciplinasComNota);

                boxDisciplinas.querySelectorAll(".check-disciplina-aluno").forEach(c => {
                    if (c.checked) disciplinasSelecionadas.add(Number(c.value));
                });

                /* =========================================
                SALVA OS DADOS. Se pediu troca de curso,
                a turma atual é mantida até o outro
                coordenador aceitar.
                ========================================= */

                const resposta = await api.put(
                    "/api/v1/alunos",
                    matricula,
                    {
                        nome: nome,
                        email: email,
                        senha: senhaDigitada,
                        telefone: telefone,
                        turma: pedidoTrocaCurso
                            ? aluno.Turma_idTurma
                            : selectTurma.value,
                        ano: document.getElementById("anoAluno").value
                    }
                );

                if (!resposta || resposta.error) {

                    let mensagem = resposta?.error || "Erro ao atualizar aluno!";

                    if (resposta?.details?.message) {
                        mensagem += "<br><br>" + resposta.details.message;
                    }

                    popupErro(mensagem, "Erro ao atualizar aluno");

                    return;

                }

                /* =========================================
                SALVA AS DISCIPLINAS
                (só se não for troca de curso e se a lista
                foi carregada do servidor)
                ========================================= */

                const salvouDisciplinas = !pedidoTrocaCurso && !!discAluno;

                if (salvouDisciplinas) {

                    const respostaDisc = await api.put(
                        ROTAS_DISC.salvar,
                        matricula,
                        { disciplinas: [...disciplinasSelecionadas] }
                    );

                    if (!respostaDisc || respostaDisc.error) {

                        let mensagem = respostaDisc?.error ||
                            "Os dados foram salvos, mas não foi possível atualizar as disciplinas.";

                        if (respostaDisc?.details?.message) {
                            mensagem += "<br><br>" + respostaDisc.details.message;
                        }

                        popupErro(mensagem, "Erro ao atualizar disciplinas");

                        return;

                    }

                }

                /* =========================================
                HISTÓRICO: ALUNO, TURMA E O QUE MUDOU
                ========================================= */

                const turmaFinalId = pedidoTrocaCurso
                    ? aluno.Turma_idTurma
                    : Number(selectTurma.value);

                const alteracoes = [];

                if (nome !== (aluno.nome || "")) {
                    alteracoes.push(`nome: "${aluno.nome || ""}" → "${nome}"`);
                }

                if (email !== (aluno.email || "")) {
                    alteracoes.push(`email: "${aluno.email || ""}" → "${email}"`);
                }

                if (telefone !== (aluno.telefone || "")) {
                    alteracoes.push(`telefone: "${aluno.telefone || "vazio"}" → "${telefone || "vazio"}"`);
                }

                if (anoNovo !== String(aluno.ano || "")) {
                    alteracoes.push(`ano: ${aluno.ano || "vazio"} → ${anoNovo || "vazio"}`);
                }

                if (!pedidoTrocaCurso && turmaFinalId !== Number(aluno.Turma_idTurma)) {
                    alteracoes.push(
                        `turma: ${nomeTurmaPorId(aluno.Turma_idTurma)} → ${nomeTurmaPorId(turmaFinalId)}`
                    );
                }

                if (senhaDigitada !== "") {
                    alteracoes.push("senha redefinida");
                }

                if (salvouDisciplinas) {

                    const adicionadas = [...disciplinasSelecionadas]
                        .filter(id => !idsDisciplinasAluno.has(id))
                        .map(nomeDisciplinaPorId);

                    const removidas = [...idsDisciplinasAluno]
                        .filter(id => !disciplinasSelecionadas.has(id))
                        .map(nomeDisciplinaPorId);

                    if (adicionadas.length > 0) {
                        alteracoes.push(`disciplinas adicionadas: ${adicionadas.join(", ")}`);
                    }

                    if (removidas.length > 0) {
                        alteracoes.push(`disciplinas removidas: ${removidas.join(", ")}`);
                    }
                }

                if (alteracoes.length > 0) {

                    await registrarHistoricoCoordenador(
                        "Edição de aluno",
                        `Aluno ${nome} (matrícula ${matricula}, turma ${nomeTurmaPorId(turmaFinalId)}) editado. ` +
                        `Alterações: ${alteracoes.join("; ")}.`,
                        Number(aluno.Curso_idCurso ?? professorLogado.cursoCoordenado)
                    );
                }

                /* =========================================
                SOLICITAÇÃO DE TROCA DE CURSO
                ========================================= */

                if (pedidoTrocaCurso) {

                    try {

                        await api.post(
                            "/api/v1/solicitacoes-transferencia",
                            {
                                matricula: Number(matricula),
                                idCursoDestino: cursoEscolhido,
                                idTurmaDestino: Number(selectTurma.value)
                            }
                        );

                        popupSucesso(
                            "Dados atualizados. A solicitação de troca de curso foi enviada ao coordenador do outro curso."
                        );

                    } catch (erroSolicitacao) {

                        popupErro(
                            erroSolicitacao.response?.error ||
                            "Os dados foram salvos, mas não foi possível enviar a solicitação de troca de curso."
                        );

                    }

                } else {

                    popupSucesso("Aluno atualizado com sucesso!");

                }

                await carregarAlunos();

            }
            catch (erro) {

                popupErro("Ocorreu um erro ao atualizar o aluno.");

            }

        });

    }
    catch (erro) {

        popupErro("Não foi possível carregar os dados do aluno.");

    }

}


/* =========================================================
   EXCLUIR ALUNO
   (substitui a função excluirAluno atual do coordenador.js)

   Histórico: mostra o aluno excluído, a matrícula e a turma.
   A turma é buscada ANTES da exclusão, porque depois que o
   aluno some do banco não dá mais para consultar.
========================================================= */

async function excluirAluno(matricula) {

    try {

        const confirmar = await popupConfirmar(
            "Deseja excluir este aluno? As disciplinas vinculadas a ele também serão removidas."
        );

        if (!confirmar) return;

        let nomeAluno = `matrícula ${matricula}`;
        let nomeTurma = "turma não informada";
        let idCursoAluno = null;

        try {

            const aluno = await api.getById("/api/v1/alunos", matricula);

            if (aluno?.nome) {
                nomeAluno = aluno.nome;
            }

            idCursoAluno = aluno?.Curso_idCurso ?? null;

            const turmas = await api.get("/api/v1/turmas?todos=true");

            const turma = Array.isArray(turmas)
                ? turmas.find(t => Number(t.idTurma) === Number(aluno?.Turma_idTurma))
                : null;

            if (turma?.nomeTurma) {
                nomeTurma = turma.nomeTurma;
            }

        } catch (erroBusca) {
        }

        /* ---------- O ALUNO TEM NOTAS? ---------- */

        let qtdDisciplinasComNota = 0;

        try {

            const info = await api.get(
                `/api/v1/alunos/${encodeURIComponent(matricula)}/disciplinas`
            );

            qtdDisciplinasComNota =
                Array.isArray(info?.comNota) ? info.comNota.length : 0;

        } catch (erroConsulta) {
        }

        let possuiNotas = qtdDisciplinasComNota > 0;

        let resposta = null;
        let erroLancado = null;

        /* ---------- SEM NOTAS: EXCLUSÃO NORMAL ---------- */

        if (!possuiNotas) {

            try {
                resposta = await api.delete("/api/v1/alunos", matricula);
            } catch (erro) {
                erroLancado = erro;
            }

            /* Se a consulta acima falhou mas o servidor achou notas */
            const dadosErro = erroLancado?.response ?? resposta;

            possuiNotas = dadosErro?.details?.possuiNotas === true;
        }

        let comNotas = false;

        /* ---------- COM NOTAS: AVISA E JÁ PEDE A SENHA ---------- */

        if (possuiNotas) {

            const respostaForcada = await abrirModalExcluirAlunoComNotas(
                matricula,
                nomeAluno,
                qtdDisciplinasComNota
            );

            if (!respostaForcada) return;

            resposta = respostaForcada;
            comNotas = true;

        } else if (erroLancado || resposta?.error) {

            popupErro(
                mensagemErroApi(erroLancado ?? resposta, "Não foi possível excluir o aluno."),
                "Não foi possível excluir o aluno"
            );

            return;
        }

        popupSucesso(resposta?.message || "Aluno excluído com sucesso!");

        await registrarHistoricoCoordenador(
            "Exclusão de aluno",
            comNotas
                ? `Aluno ${nomeAluno} (matrícula ${matricula}, turma ${nomeTurma}) excluído junto com as notas dele.`
                : `Aluno ${nomeAluno} (matrícula ${matricula}, turma ${nomeTurma}) excluído.`,
            Number(idCursoAluno ?? professorLogado.cursoCoordenado)
        );

        await carregarAlunos();

    }
    catch (erro) {

        popupErro("Ocorreu um erro ao excluir o aluno.");

    }

}

/* =========================================================
LIMPAR ALUNOS - NOVO ANO LETIVO
========================================================= */

function abrirModalLimparAlunos() {

    document.getElementById("modalLimparAlunos")?.remove();

    const modal = criarElemento("tpl-modal-limpar-alunos");

    document.body.appendChild(modal);

    modal.querySelector("#btnCancelarLimparAlunos")
        .addEventListener("click", () => modal.remove());

    modal.querySelector("#btnConfirmarLimparAlunos")
        .addEventListener("click", confirmarLimpezaAlunos);

    const inputSenha = modal.querySelector("#senhaLimparAlunos");

    inputSenha.addEventListener("keydown", event => {

        if (event.key === "Enter") {
            confirmarLimpezaAlunos();
        }

    });

    inputSenha.focus();

}

async function confirmarLimpezaAlunos() {

    const inputSenha = document.getElementById("senhaLimparAlunos");
    const erro = document.getElementById("erroLimparAlunos");
    const botao = document.getElementById("btnConfirmarLimparAlunos");

    // LIMPAR ERRO ANTERIOR
    erro.textContent = "";

    // PEGAR SENHA
    const senha = inputSenha.value.trim();

    if (!senha) {
        erro.textContent = "Digite sua senha de coordenador.";
        inputSenha.focus();
        return;
    }

    // RECUPERAR COORDENADOR LOGADO
    const registro = professorLogado?.registro;

    if (
        registro === undefined ||
        registro === null ||
        String(registro).trim() === ""
    ) {
        erro.textContent = "Não foi possível identificar o coordenador logado.";
        return;
    }


    // BLOQUEAR BOTÃO
    botao.disabled = true;
    botao.textContent = "Limpando...";

    try {

        // ENVIAR PARA O BACK-END
        const resposta = await api.post(
            "/api/v1/alunos/limpar-registros",
            { registro: registro, senha: senha }
        );


        // FECHAR MODAL
        document.getElementById("modalLimparAlunos")?.remove();

        // MENSAGEM DE SUCESSO
        const quantidade = resposta?.quantidade;

        if (quantidade !== undefined) {
            popupSucesso(`${quantidade} aluno(s) removido(s) com sucesso!`);
        } else {
            popupSucesso("Alunos removidos com sucesso!");
        }

        // ATUALIZAR LISTA
        if (typeof carregarAlunos === "function") {
            await carregarAlunos();
        }

    } catch (erroApi) {


        // REATIVAR BOTÃO
        botao.disabled = false;
        botao.textContent = "Confirmar limpeza";

        // MENSAGEM AMIGÁVEL PARA O USUÁRIO
        const respostaServidor = erroApi?.response;

        let mensagem = "Não foi possível realizar a limpeza. Tente novamente.";

        if (respostaServidor?.details?.message) {

            mensagem = respostaServidor.details.message;

        } else if (respostaServidor?.error) {

            mensagem = respostaServidor.error;

        } else if (/401/.test(String(erroApi?.message))) {

            mensagem = "Senha incorreta. Tente novamente.";
        }

        erro.textContent = mensagem;

        inputSenha.value = "";

        inputSenha.focus();
    }
}

/* =========================================================
HISTÓRICO DO COORDENADOR
========================================================= */

async function carregarHistoricoCoordenador() {

    try {

        const historico = await api.get(API_HISTORICO_COORDENADOR);

        if (!Array.isArray(historico)) {
            popupErro("Não foi possível carregar o histórico.");
            return;
        }

        mostrarTela("tpl-historico", {
            total: historico.length,
            rotulo: historico.length === 1 ? "ação registrada" : "ações registradas"
        });

        const tbody = document.getElementById("tbodyHistoricoCoordenador");
        const grupoCurso = document.getElementById("grupoCursoHistorico");
        const selectCurso = document.getElementById("selectCursoHistorico");

        if (historico.length === 0) {
            tbody.replaceChildren(clonarTemplate("tpl-historico-vazio"));
            return;
        }

        const idCursoDe = item => Number(item.Curso_idCurso ?? item.idCurso) || 0;

        /* mais recente primeiro (data; se empatar, pelo ID) */
        const historicoOrdenado = [...historico].sort((a, b) => {

            const dataA = new Date(obterDataHistorico(a) ?? 0).getTime() || 0;
            const dataB = new Date(obterDataHistorico(b) ?? 0).getTime() || 0;

            if (dataB !== dataA) {
                return dataB - dataA;
            }

            return obterIdHistorico(b) - obterIdHistorico(a);
        });

        function renderizar(filtro) {

            const lista = filtro === "todos"
                ? historicoOrdenado
                : historicoOrdenado.filter(item => String(idCursoDe(item)) === filtro);

            if (lista.length === 0) {
                tbody.replaceChildren(clonarTemplate("tpl-historico-vazio"));
                return;
            }

            tbody.replaceChildren(...lista.map(item =>
                criarElemento("tpl-linha-historico", {
                    data: formatarDataHistorico(obterDataHistorico(item)),
                    nomeProfessor: item.nomeProfessor,
                    acao: item.acao,
                    descricao: item.descricao
                })
            ));
        }

        /* cursos que aparecem no histórico (o servidor já devolve só os do coordenador) */
        const cursos = new Map();

        historico.forEach(item => {
            const id = idCursoDe(item);
            if (id && !cursos.has(id)) {
                cursos.set(id, item.nomeCurso ?? `Curso ${id}`);
            }
        });

        const opcoes = [new Option("Todos os cursos", "todos")];

        [...cursos.entries()]
            .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
            .forEach(([id, nome]) => opcoes.push(new Option(nome, String(id))));

        /* só mostra o filtro se o coordenador administra mais de um curso */
        if (selectCurso && grupoCurso && cursos.size > 1) {

            selectCurso.replaceChildren(...opcoes);
            grupoCurso.style.display = "";

            selectCurso.addEventListener("change", () => renderizar(selectCurso.value));
        }

        renderizar("todos");

    } catch (erro) {

        popupErro("Não foi possível carregar o histórico do coordenador.");
    }
}

async function registrarHistoricoCoordenador(acao, descricao, idCurso = null) {

    if (!professorLogado || !professorLogado.registro) {
        return;
    }

    const cursoDaAcao = Number(idCurso ?? professorLogado.cursoCoordenado) || null;

    try {
        await api.post(API_HISTORICO_COORDENADOR, {
            acao: acao,
            descricao: descricao || null,
            Curso_idCurso: cursoDaAcao
        });

        if (typeof atualizarBadgeHistorico === "function") {
            atualizarBadgeHistorico();
        }

    } catch (erro) {
    }
}

/* =========================================================
ESCAPAR HTML
========================================================= */

function escaparHTML(valor) {

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}

/* =========================================================
GRÁFICO DE DISTRIBUIÇÃO DE NOTAS
========================================================= */

function atualizarGrafico(adpDaTurma, mapaNotas, bimestreSelecionado) {

    const canvas = document.getElementById("graficoNotas");

    if (!canvas) return;

    /* =====================================================
    DEFINIR AS NOTAS DOS ALUNOS
    ===================================================== */

    const notasAlunos = [];

    const lerValor = notaObj => {

        const valor = notaObj?.nota ?? notaObj?.Nota;

        if (valor === null || valor === undefined || valor === "") return null;

        const numero = Number(valor);

        return isNaN(numero) ? null : numero;

    };

    adpDaTurma.forEach(rel => {

        const idAdp = rel.idAlunoDisciplinaProfessor ?? rel.id ?? rel.ID;

        if (idAdp == null) return;

        const notas = mapaNotas[String(idAdp)] ?? {};

        let notaFinal = null;

        if (bimestreSelecionado === "todos") {

            /* TODOS = MÉDIA FINAL */
            const valores = [
                "1º Bimestre",
                "2º Bimestre",
                "3º Bimestre",
                "4º Bimestre"
            ]
                .map(nomeBimestre => lerValor(notas[nomeBimestre]))
                .filter(valor => valor !== null);

            if (valores.length > 0) {
                notaFinal = valores.reduce((total, valor) => total + valor, 0) / valores.length;
            }

        } else {

            /* BIMESTRE ESPECÍFICO */
            notaFinal = lerValor(notas[bimestreSelecionado]);

        }

        /* Só adiciona quem possui nota */
        if (notaFinal !== null) {
            notasAlunos.push(notaFinal);
        }

    });

    const quantidadePorNota = Array(11).fill(0);

    notasAlunos.forEach(nota => {

        let notaArredondada = Math.floor(nota);

        if (notaArredondada < 0) notaArredondada = 0;
        if (notaArredondada > 10) notaArredondada = 10;

        quantidadePorNota[notaArredondada]++;

    });

    /* =====================================================
    MÉDIA DA TURMA
    ===================================================== */

    const elementoMedia = document.getElementById("mediaTurma");

    let mediaTurma = 0;

    if (notasAlunos.length > 0) {
        mediaTurma = notasAlunos.reduce((total, nota) => total + nota, 0) / notasAlunos.length;
    }

    if (elementoMedia) {
        elementoMedia.textContent = notasAlunos.length > 0
            ? mediaTurma.toFixed(1)
            : "—";
    }

    /* =====================================================
    SUBTÍTULO
    ===================================================== */

    const subtitulo = document.getElementById("graficoSubtitulo");

    if (subtitulo) {

        subtitulo.textContent = bimestreSelecionado === "todos"
            ? "Distribuição das médias finais dos alunos"
            : `Distribuição das notas — ${bimestreSelecionado}`;

    }

    /* =====================================================
    DESTRUIR GRÁFICO ANTERIOR
    ===================================================== */

    if (_graficoNotas) {

        _graficoNotas.destroy();

        _graficoNotas = null;

    }

    /* =====================================================
    CRIAR GRÁFICO
    ===================================================== */

    const fonteEixo = { family: "Lato", size: 12, weight: "700" };

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

            interaction: {
                intersect: false,
                mode: "index"
            },

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
                        font: fonteEixo
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
                        font: fonteEixo
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

const STATUS_CONTESTACAO_EM_ANALISE = "Em análise";
const STATUS_CONTESTACAO_ALTERADO = "Alterado";
const STATUS_CONTESTACAO_RECUSADA = "Recusada";

/* Converte qualquer status (inclusive antigos) para um dos 3 válidos */
function normalizarStatusContestacao(status) {

    if (status === null || status === undefined || status === "") {
        return STATUS_CONTESTACAO_EM_ANALISE;
    }

    const s = String(status).trim().toLowerCase();

    if (["alterado", "alterada", "alterar", "aprovada", "aprovado", "aceita", "aceito", "approved"].includes(s)) {
        return STATUS_CONTESTACAO_ALTERADO;
    }

    if (["recusada", "recusado", "rejeitada", "rejeitado", "rejected", "denied"].includes(s)) {
        return STATUS_CONTESTACAO_RECUSADA;
    }

    return STATUS_CONTESTACAO_EM_ANALISE;
}

/* Classes CSS do selo de status (as duas de "Em análise" cobrem os CSS antigos e novos) */
function classesStatusContestacao(status) {

    switch (normalizarStatusContestacao(status)) {

        case STATUS_CONTESTACAO_ALTERADO:
            return ["status-aprovada"];

        case STATUS_CONTESTACAO_RECUSADA:
            return ["status-recusada"];

        default:
            return ["status-analise", "status-pendente"];
    }
}

function formatarNotaContestacao(valor) {

    if (valor === null || valor === undefined || valor === "") {
        return "—";
    }

    const numero = Number(valor);

    return Number.isNaN(numero) ? "—" : numero.toFixed(1);
}

async function abrirContestacoes() {

    const registro = professorLogado.registro;

    if (!registro) {
        popupErro("Registro do professor não encontrado.");
        return;
    }

    try {

        const resposta = await api.get(`/api/v1/contestacoes/professor/${registro}`);

        const contestacoes =
            Array.isArray(resposta)
                ? resposta
                : Array.isArray(resposta?.requisicoes)
                    ? resposta.requisicoes
                    : Array.isArray(resposta?.data)
                        ? resposta.data
                        : [];

        document.getElementById("modalContestacoes")?.remove();

        if (contestacoes.length === 0) {
            popupInfo("Nenhuma contestação encontrada.");
            return;
        }

        const modal = criarElemento("tpl-modal-contestacoes");

        modal.querySelector(".modal-contestacoes-fechar")
            .addEventListener("click", fecharContestacoes);

        const lista = modal.querySelector(".lista-contestacoes");

        contestacoes.forEach(c => {

            const status = normalizarStatusContestacao(c.status);

            const id = c.idContestacao ?? c.id ?? c.ID;

            /* O professor só responde enquanto estiver em análise */
            const mostrarAcoes = status === STATUS_CONTESTACAO_EM_ANALISE;

            const card = criarElemento("tpl-card-contestacao", {
                alunoNome: c.alunoNome || c.nomeAluno || "Aluno não informado",
                matricula: c.matricula || c.Aluno_matricula || "—",
                status: status,
                nomeTurma: c.nomeTurma || "—",
                nomeDisciplina: c.nomeDisciplina || "—",
                bimestre: c.bimestre || "—",
                data: formatarData(c.dataContestacao),
                notaAnterior: formatarNotaContestacao(c.notaAnterior),
                notaAtual: formatarNotaContestacao(c.notaAtual),
                motivo: c.motivo || "Nenhum motivo informado.",
                resposta: c.resposta
            });

            card.dataset.id = id;

            card.querySelector(".status-contestacao")
                .classList.add(...classesStatusContestacao(status));

            /* "Nota atual" só faz sentido depois que a nota foi alterada */
            if (status !== STATUS_CONTESTACAO_ALTERADO) {
                card.querySelector('[data-bloco="nota-atual"]')?.remove();
            }

            if (!c.resposta) {
                card.querySelector(".contestacao-resposta")?.remove();
            }

            if (mostrarAcoes) {

                /*
                 * Os botões vêm do template (data-status).
                 * Aqui só ficam as ações válidas:
                 *   - "Aprovada"/"Alterar"/"Alterado" -> Alterado
                 *   - "Recusada" -> Recusada
                 *   - "Em análise" -> botão removido (não é ação do professor)
                 */
                card.querySelectorAll("[data-status]").forEach(botao => {

                    const acao = normalizarStatusContestacao(botao.dataset.status);

                    if (acao === STATUS_CONTESTACAO_EM_ANALISE) {
                        botao.remove();
                        return;
                    }

                    botao.dataset.status = acao;

                    botao.textContent =
                        acao === STATUS_CONTESTACAO_ALTERADO
                            ? "Alterar Nota"
                            : "Recusar";

                    botao.addEventListener("click", () => {
                        responderContestacao(id, acao);
                    });
                });

            } else {

                card.querySelector(".contestacao-acoes")?.remove();

            }

            lista.appendChild(card);

        });

        document.body.appendChild(modal);

    } catch (erro) {


        popupErro(erro?.message || "Erro ao carregar as contestações.");

    }

}

/* =========================================================
ALIAS
========================================================= */

function carregarContestacoes() {

    abrirContestacoes();

}

/* =========================================================
ABRIR JANELA PARA RESPONDER
(o modal fica fixo no coordenador.html)
========================================================= */

function responderContestacao(idContestacao, status) {


    if (!idContestacao) {
        popupErro("Contestação não encontrada.");
        return;
    }

    status = normalizarStatusContestacao(status);

    /* Só as duas ações válidas para o professor */
    if (
        status !== STATUS_CONTESTACAO_ALTERADO &&
        status !== STATUS_CONTESTACAO_RECUSADA
    ) {
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

    const textos = {
        [STATUS_CONTESTACAO_ALTERADO]: {
            titulo: "Alterar nota",
            descricao: "Escreva uma mensagem explicando ao aluno que a contestação foi aceita e que a nota será alterada.",
            botao: "Alterar nota e enviar resposta",
            classe: "btn-resposta-enviar resposta-aprovar"
        },
        [STATUS_CONTESTACAO_RECUSADA]: {
            titulo: "Recusar contestação",
            descricao: "Escreva uma mensagem explicando ao aluno o motivo da recusa.",
            botao: "Recusar e enviar resposta",
            classe: "btn-resposta-enviar resposta-recusar"
        }
    };

    const texto = textos[status];

    if (titulo) titulo.textContent = texto.titulo;

    if (descricao) descricao.textContent = texto.descricao;

    if (btnEnviar) {
        btnEnviar.textContent = texto.botao;
        btnEnviar.className = texto.classe;
    }

    modal.style.display = "flex";

    setTimeout(() => {
        textarea?.focus();
    }, 50);

}

/* =========================================================
FECHAR JANELA DE RESPOSTA
========================================================= */

function fecharModalRespostaContestacao() {

    const modal = document.getElementById("modalRespostaContestacao");

    if (modal) {
        modal.style.display = "none";
    }

    const textarea = document.getElementById("textoRespostaContestacao");

    if (textarea) {
        textarea.value = "";
    }

    _contestacaoResposta = {
        idContestacao: null,
        status: null
    };

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

    /* VALIDAR ID */
    if (!idContestacao) {
        popupErro("Não foi possível identificar a contestação.");
        return;
    }

    /* VALIDAR STATUS (Alterado ou Recusada) */
    if (
        status !== STATUS_CONTESTACAO_ALTERADO &&
        status !== STATUS_CONTESTACAO_RECUSADA
    ) {
        popupErro("Não foi possível identificar a ação.");
        return;
    }

    /* VALIDAR RESPOSTA */
    if (!resposta) {
        popupErro("Digite uma mensagem para o aluno.");
        textarea?.focus();
        return;
    }

    try {

        if (btnEnviar) {
            btnEnviar.disabled = true;
            btnEnviar.textContent = "Enviando...";
        }

        const payload = {
            idContestacao: idContestacao,
            registroProfessor: professorLogado.registro,
            status: status,
            resposta: resposta
        };


        /*
        PUT

        /api/v1/contestacoes/responder/:id
        */
        const resultado = await api.put(
            "/api/v1/contestacoes/responder",
            idContestacao,
            payload
        );


        fecharModalRespostaContestacao();

        fecharContestacoes();

        popupSucesso(
            status === STATUS_CONTESTACAO_ALTERADO
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
FECHAR MODAL DE CONTESTAÇÕES
========================================================= */

function fecharContestacoes() {

    document.getElementById("modalContestacoes")?.remove();

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
SAIR (LOGOUT)
========================================================= */

function sair() {

    sessionStorage.clear();

    window.location.replace("paginaLogin.html");

}

/* =========================================================
EXPORTS GLOBAIS
(usados por onclick="..." que ainda existem no HTML)
========================================================= */

window.sair = sair;
window.carregarAlunos = carregarAlunos;
window.importarAlunos = importarAlunos;
window.lerCSVAlunos = lerCSVAlunos;
window.converterCSVParaObjetos = converterCSVParaObjetos;
window.mostrarPreviaImportacaoAlunos = mostrarPreviaImportacaoAlunos;
window.cadastrarAlunosCSV = cadastrarAlunosCSV;
window.editarAluno = editarAluno;
window.excluirAluno = excluirAluno;
window.escaparHTML = escaparHTML;
window.fecharContestacoes = fecharContestacoes;
window.responderContestacao = responderContestacao;
window.fecharModalRespostaContestacao = fecharModalRespostaContestacao;
window.enviarRespostaContestacao = enviarRespostaContestacao;
window.abrirContestacoes = abrirContestacoes;
window.carregarContestacoes = carregarContestacoes;