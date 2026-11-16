module.exports = class ContestacaoControl {

    #contestacaoService;


    constructor(contestacaoServiceDependency) {

        console.log("✅ ContestacaoControl.constructor()");

        this.#contestacaoService = contestacaoServiceDependency;
    }


    /* =========================================================
       ENVIAR CONTESTAÇÃO
       POST /api/v1/contestacoes
    ========================================================= */

    enviarContestacao = async (request, response, next) => {

        console.log("✅ ContestacaoControl.enviarContestacao()");

        try {

            const { matricula, idDisciplina, bimestre, motivo } = request.body;

            await this.#contestacaoService.enviarContestacao(
                matricula,
                idDisciplina,
                bimestre,
                motivo
            );

            return response.status(200).json({
                success: true,
                message: "Contestação enviada com sucesso."
            });

        } catch (error) {

            console.error("❌ Erro ao enviar contestação:", error);

            next(error);
        }
    };


    /* =========================================================
       LISTAR CONTESTAÇÕES DO ALUNO
       GET /api/v1/contestacoes/aluno/:matricula
    ========================================================= */

    listarPorAluno = async (request, response, next) => {

        console.log("✅ ContestacaoControl.listarPorAluno()");

        try {

            const { matricula } = request.params;

            const requisicoes = await this.#contestacaoService.listarPorAluno(
                matricula
            );

            return response.status(200).json({
                success: true,
                requisicoes
            });

        } catch (error) {

            console.error("❌ Erro ao listar contestações do aluno:", error);

            next(error);
        }
    };


    /* =========================================================
       DISCIPLINAS DO ALUNO COM AS NOTAS FECHADAS
       GET /api/v1/contestacoes/aluno/:matricula/trava

       Resposta: { success, disciplinasTravadas: [idDisciplina, ...] }
    ========================================================= */

    listarDisciplinasTravadas = async (request, response, next) => {

        console.log("✅ ContestacaoControl.listarDisciplinasTravadas()");

        try {

            const { matricula } = request.params;

            const disciplinasTravadas =
                await this.#contestacaoService.listarDisciplinasTravadas(matricula);

            return response.status(200).json({
                success: true,
                disciplinasTravadas
            });

        } catch (error) {

            console.error("❌ Erro ao listar disciplinas travadas:", error);

            next(error);
        }
    };


    /* =========================================================
       LISTAR CONTESTAÇÕES DO PROFESSOR
       GET /api/v1/contestacoes/professor/:registro
    ========================================================= */

    listarPorProfessor = async (request, response, next) => {

        console.log("✅ ContestacaoControl.listarPorProfessor()");

        try {

            const { registro } = request.params;

            const requisicoes = await this.#contestacaoService.listarPorProfessor(
                registro
            );

            return response.status(200).json({
                success: true,
                requisicoes
            });

        } catch (error) {

            console.error("❌ Erro ao listar contestações do professor:", error);

            next(error);
        }
    };


    /* =========================================================
       QUANTAS CONTESTAÇÕES AGUARDAM RESPOSTA
       GET /api/v1/contestacoes/professor/:registro/pendentes

       Resposta: { success, total }
    ========================================================= */

    contarPendentes = async (request, response, next) => {

        console.log("✅ ContestacaoControl.contarPendentes()");

        try {

            const { registro } = request.params;

            const total = await this.#contestacaoService.contarPendentes(
                registro
            );

            return response.status(200).json({
                success: true,
                total
            });

        } catch (error) {

            console.error("❌ Erro ao contar contestações pendentes:", error);

            next(error);
        }
    };


    /* =========================================================
       RESPONDER CONTESTAÇÃO
       PUT /api/v1/contestacoes/responder/:idContestacao

       Body: { registroProfessor, status, resposta }

       status: Alterado | Recusada
    ========================================================= */

    responder = async (request, response, next) => {

        console.log("✅ ContestacaoControl.responder()");

        try {

            const { idContestacao } = request.params;

            const { registroProfessor, status, resposta } = request.body;

            await this.#contestacaoService.responder(
                idContestacao,
                registroProfessor,
                status,
                resposta
            );

            const alterado = status === "Alterado" || status === "Alterar";

            return response.status(200).json({
                success: true,
                message: alterado
                    ? "Contestação aceita. A nota deve ser alterada."
                    : "Contestação recusada com sucesso."
            });

        } catch (error) {

            console.error("❌ Erro ao responder contestação:", error);

            next(error);
        }
    };

};