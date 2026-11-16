const bcrypt =
    require("bcryptjs");

const ErrorResponse =
    require("../utils/ErrorResponse");


module.exports = class ConfiguracaoNotasService {

    #configuracaoNotasDAO;
    #professorDAO;
    #historicoCoordenadorService;


    constructor(
        configuracaoNotasDAO,
        professorDAO,
        historicoCoordenadorService = null
    ) {

        console.log(
            "✅ ConfiguracaoNotasService.constructor() (por curso)"
        );

        this.#configuracaoNotasDAO =
            configuracaoNotasDAO;

        this.#professorDAO =
            professorDAO;

        this.#historicoCoordenadorService =
            historicoCoordenadorService;
    }


    // =========================================================
    // HISTÓRICO (não derruba a operação se falhar)
    // =========================================================

    #registrarHistorico = async (
        registro,
        acao,
        descricao
    ) => {

        if (!this.#historicoCoordenadorService) {
            return;
        }

        try {

            await this.#historicoCoordenadorService
                .registrar(
                    registro,
                    acao,
                    descricao
                );

        } catch (error) {

            console.error(
                "⚠️ Erro ao registrar histórico das notas:",
                error
            );
        }
    };


    // =========================================================
    // QUEM FAZ A AÇÃO PRECISA SER COORDENADOR DE UM CURSO
    // =========================================================

    #obterCoordenador = async (registro, mensagem) => {

        const professor =
            await this.#professorDAO
                .findByRegistro(registro);


        if (
            !professor ||
            Number(professor.coordenador) !== 1 ||
            professor.CursoCoordenado_idCurso === null ||
            professor.CursoCoordenado_idCurso === undefined
        ) {

            throw new ErrorResponse(
                403,
                mensagem,
                {
                    message:
                        "Acesso negado."
                }
            );
        }


        return professor;
    };


    // =========================================================
    // ESTADO ATUAL
    //
    // Com idCurso: estado daquele curso.
    // Sem idCurso: lista dos cursos fechados (notasFechadas = 1
    // se houver algum), para telas que não sabem o curso.
    // =========================================================

    getEstado = async (idCurso) => {

        const curso =
            Number(idCurso);


        if (
            Number.isInteger(curso) &&
            curso > 0
        ) {

            const config =
                await this.#configuracaoNotasDAO
                    .findConfig(curso);


            return {

                idCurso:
                    curso,

                notasFechadas:
                    config
                        ? Number(config.notasFechadas)
                        : 0

            };
        }


        const cursosFechados =
            await this.#configuracaoNotasDAO
                .listarCursosFechados();


        return {

            idCurso:
                null,

            notasFechadas:
                cursosFechados.length > 0 ? 1 : 0,

            cursosFechados

        };
    };


    // =========================================================
    // AS NOTAS DESTE CURSO ESTÃO FECHADAS?
    // =========================================================

    notasFechadasDoCurso = async (idCurso) => {

        const config =
            await this.#configuracaoNotasDAO
                .findConfig(idCurso);


        return (
            !!config &&
            Number(config.notasFechadas) === 1
        );
    };


    // =========================================================
    // CURSO DE UMA NOTA / DE UM VÍNCULO ALUNO-DISCIPLINA
    // (usado pelo BloqueioNotasMiddleware)
    // =========================================================

    cursoDaNota = async (idNota) =>
        this.#configuracaoNotasDAO.cursoDaNota(idNota);


    cursoDoVinculo = async (idAdp) =>
        this.#configuracaoNotasDAO.cursoDoVinculo(idAdp);


    // =========================================================
    // FECHAR AS NOTAS DO CURSO QUE EU COORDENO
    // (exige a senha do coordenador)
    // =========================================================

    fecharNotas = async (
        registro,
        senha
    ) => {

        console.log(
            "🟢 ConfiguracaoNotasService.fecharNotas():",
            registro
        );


        if (!senha) {

            throw new ErrorResponse(
                400,
                "Informe a senha do coordenador.",
                {
                    message:
                        "Senha não informada."
                }
            );
        }


        const professor =
            await this.#obterCoordenador(
                registro,
                "Apenas o coordenador pode fechar as notas."
            );


        const senhaCorreta =
            await bcrypt.compare(
                String(senha),
                String(professor.senha ?? "")
            );


        if (!senhaCorreta) {

            throw new ErrorResponse(
                403,
                "Senha incorreta.",
                {
                    message:
                        "Senha incorreta."
                }
            );
        }


        const idCurso =
            Number(
                professor.CursoCoordenado_idCurso
            );


        await this.#configuracaoNotasDAO
            .updateStatus(idCurso, 1, registro);


        await this.#registrarHistorico(
            registro,
            "Fechou as notas",
            "Fechou o lançamento de notas do curso. Os professores não podem mais lançar ou alterar notas deste curso."
        );


        return {

            idCurso,

            notasFechadas:
                1

        };
    };


    // =========================================================
    // LIBERAR AS NOTAS DO CURSO QUE EU COORDENO
    // =========================================================

    liberarNotas = async (registro) => {

        console.log(
            "🟢 ConfiguracaoNotasService.liberarNotas():",
            registro
        );


        const professor =
            await this.#obterCoordenador(
                registro,
                "Apenas o coordenador pode liberar as notas."
            );


        const idCurso =
            Number(
                professor.CursoCoordenado_idCurso
            );


        await this.#configuracaoNotasDAO
            .updateStatus(idCurso, 0, registro);


        await this.#registrarHistorico(
            registro,
            "Liberou as notas",
            "Liberou o lançamento de notas do curso para os professores."
        );


        return {

            idCurso,

            notasFechadas:
                0

        };
    };

};