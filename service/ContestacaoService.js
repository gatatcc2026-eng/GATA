const nodemailer = require("nodemailer");
const ErrorResponse = require("../utils/ErrorResponse");


/* =========================================================
   STATUS VÁLIDOS DAS CONTESTAÇÕES
========================================================= */

const STATUS_EM_ANALISE = "Em análise";
const STATUS_ALTERADO = "Alterado";
const STATUS_RECUSADA = "Recusada";


module.exports = class ContestacaoService {

    #contestacaoDAO;


    constructor(contestacaoDAODependency) {

        console.log("✅ ContestacaoService.constructor()");

        this.#contestacaoDAO = contestacaoDAODependency;
    }


    /* =========================================================
       ENVIAR CONTESTAÇÃO
    ========================================================= */

    enviarContestacao = async (matricula, idDisciplina, bimestre, motivo) => {

        console.log("✅ ContestacaoService.enviarContestacao()");

        if (!matricula) {
            throw new ErrorResponse(400, "Matrícula do aluno não informada.");
        }

        if (!idDisciplina) {
            throw new ErrorResponse(400, "Disciplina não informada.");
        }

        if (!bimestre) {
            throw new ErrorResponse(400, "Bimestre não informado.");
        }

        if (!motivo || motivo.trim() === "") {
            throw new ErrorResponse(400, "Informe o motivo da contestação.");
        }

        /* ---------- NOTAS FECHADAS PELO COORDENADOR DO CURSO ---------- */

        const notasFechadas = await this.#contestacaoDAO.notasFechadasDaDisciplina(
            idDisciplina
        );

        if (notasFechadas) {
            throw new ErrorResponse(
                403,
                "As notas desta disciplina foram fechadas pelo coordenador do curso. " +
                "Não é possível contestar no momento."
            );
        }

        /* ---------- PROFESSOR RESPONSÁVEL ---------- */

        const dados = await this.#contestacaoDAO.buscarDadosProfessor(
            matricula,
            idDisciplina
        );

        if (!dados) {
            throw new ErrorResponse(
                404,
                "Não foi possível encontrar o professor responsável pela disciplina."
            );
        }

        /* ---------- SALVAR (status inicial: Em análise) ---------- */

        const idContestacao = await this.#contestacaoDAO.criar(
            matricula,
            idDisciplina,
            bimestre,
            motivo.trim()
        );

        console.log("✅ Contestação salva. ID:", idContestacao);

        /* ---------- E-MAIL (best-effort) ---------- */

        await this.#notificarProfessorPorEmail(dados, bimestre, motivo);

        return true;
    };


    /* =========================================================
       NOTIFICAR PROFESSOR
    ========================================================= */

    #notificarProfessorPorEmail = async (dados, bimestre, motivo) => {

        if (!dados.emailProfessor) {
            console.warn("⚠️ Professor responsável não possui e-mail cadastrado.");
            return;
        }

        if (!process.env.EMAIL || !process.env.SENHA_EMAIL) {
            console.error("❌ EMAIL ou SENHA_EMAIL não encontrados no .env.");
            return;
        }

        try {

            const gmail = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.SENHA_EMAIL
                }
            });

            await gmail.sendMail({

                from: process.env.EMAIL,

                to: dados.emailProfessor,

                subject: `Contestação de nota - ${dados.alunoNome}`,

                html: `

                    <h2>Contestação de Nota</h2>

                    <p>
                        Olá <strong>${dados.professorNome}</strong>!
                    </p>

                    <p>
                        O aluno abaixo realizou uma contestação de nota.
                    </p>

                    <hr>

                    <p><strong>Aluno:</strong> ${dados.alunoNome}</p>

                    <p><strong>Matrícula:</strong> ${dados.matricula}</p>

                    <p><strong>Disciplina:</strong> ${dados.nomeDisciplina}</p>

                    <p><strong>Bimestre:</strong> ${bimestre}</p>

                    <hr>

                    <h3>Motivo da contestação</h3>

                    <p>${motivo}</p>

                    <hr>

                    <p>
                        <small>
                            Acesse o Sistema GATA para analisar a contestação.
                        </small>
                    </p>

                    <p>
                        <small>
                            Esta mensagem foi enviada automaticamente pelo Sistema GATA.
                        </small>
                    </p>

                `
            });

            console.log(
                "✅ E-mail de contestação enviado para:",
                dados.emailProfessor
            );

        } catch (erro) {

            console.error(
                "❌ Falha ao enviar e-mail de contestação:",
                erro.message
            );
        }
    };


    /* =========================================================
       LISTAR POR ALUNO
    ========================================================= */

    listarPorAluno = async (matricula) => {

        console.log("✅ ContestacaoService.listarPorAluno()");

        return this.#contestacaoDAO.buscarPorAluno(matricula);
    };


    /* =========================================================
       DISCIPLINAS DO ALUNO COM AS NOTAS FECHADAS
       (o front desativa o botão "Contestar" nelas)
    ========================================================= */

    listarDisciplinasTravadas = async (matricula) => {

        console.log("✅ ContestacaoService.listarDisciplinasTravadas()");

        return this.#contestacaoDAO.buscarDisciplinasTravadasDoAluno(matricula);
    };


    /* =========================================================
       LISTAR POR PROFESSOR
    ========================================================= */

    listarPorProfessor = async (registroProfessor) => {

        console.log("✅ ContestacaoService.listarPorProfessor()");

        return this.#contestacaoDAO.buscarPorProfessor(registroProfessor);
    };


    /* =========================================================
       QUANTAS CONTESTAÇÕES AGUARDAM RESPOSTA (ícone do professor
       e do coordenador)
    ========================================================= */

    contarPendentes = async (registroProfessor) => {

        console.log("✅ ContestacaoService.contarPendentes()");

        return this.#contestacaoDAO.contarPendentesPorProfessor(registroProfessor);
    };


    /* =========================================================
       RESPONDER CONTESTAÇÃO
       status aceito: Alterado | Recusada
       ("Alterar" é aceito só por compatibilidade e vira "Alterado")
    ========================================================= */

    responder = async (idContestacao, registroProfessor, status, resposta) => {

        console.log("✅ ContestacaoService.responder()");

        if (status === "Alterar") {
            status = STATUS_ALTERADO;
        }

        const statusPermitidos = [STATUS_ALTERADO, STATUS_RECUSADA];

        if (!statusPermitidos.includes(status)) {
            throw new ErrorResponse(
                400,
                "Status inválido. Use 'Alterado' ou 'Recusada'."
            );
        }

        if (!resposta || resposta.trim() === "") {
            throw new ErrorResponse(
                400,
                "Informe uma resposta para a contestação."
            );
        }

        /* ---------- BUSCAR CONTESTAÇÃO ---------- */

        const contestacaoAtual = await this.#contestacaoDAO.buscarPorId(
            idContestacao
        );

        if (!contestacaoAtual) {
            throw new ErrorResponse(404, "Contestação não encontrada.");
        }

        /* ---------- GARANTIR QUE ESTÁ EM ANÁLISE ---------- */

        if (
            contestacaoAtual.status !== STATUS_EM_ANALISE &&
            contestacaoAtual.status !== "Pendente"
        ) {
            throw new ErrorResponse(400, "Esta contestação já foi respondida.");
        }

        /* ---------- PROFESSOR RESPONSÁVEL ---------- */

        if (
            registroProfessor &&
            Number(contestacaoAtual.registroProfessorResponsavel) !==
                Number(registroProfessor)
        ) {
            throw new ErrorResponse(
                403,
                "Você não tem permissão para responder esta contestação."
            );
        }

        /* ---------- ATUALIZAR ---------- */

        return this.#contestacaoDAO.responder(
            idContestacao,
            status,
            resposta.trim()
        );
    };

};