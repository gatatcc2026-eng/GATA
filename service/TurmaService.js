
const Turma = require("../model/Turma");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class TurmaService {

    #turmaDAO;


    constructor(TurmaDAODependency) {

        console.log(
            "✅ TurmaService.constructor()"
        );

        this.#turmaDAO =
            TurmaDAODependency;

    }


    /* =========================================================
       CRIAR TURMA
    ========================================================= */

    createTurma = async (
        TurmaJson,
        cursoCoordenadoLogado
    ) => {

        console.log(
            "✅ TurmaService.createTurma()"
        );

        console.log(
            "📦 Dados recebidos:",
            TurmaJson
        );


        const {
            nomeTurma
        } = TurmaJson;


        /* =====================================================
           NOME
        ===================================================== */

        if (
            nomeTurma === undefined ||
            nomeTurma === null ||
            String(nomeTurma).trim() === ""
        ) {

            throw new Error(
                "O nome da turma é obrigatório."
            );

        }


        const nomeTratado =
            String(nomeTurma).trim();


        /* =====================================================
           CURSO DO COORDENADOR
        ===================================================== */

        if (
            cursoCoordenadoLogado === undefined ||
            cursoCoordenadoLogado === null ||
            cursoCoordenadoLogado === ""
        ) {

            throw new Error(
                "O curso do coordenador não foi identificado."
            );

        }


        const cursoId =
            Number(
                cursoCoordenadoLogado
            );


        if (
            !Number.isInteger(cursoId) ||
            cursoId <= 0
        ) {

            throw new Error(
                "O ID do curso do coordenador é inválido."
            );

        }


        /* =====================================================
           VERIFICAR NOME DUPLICADO
        ===================================================== */

        const turmaPorNome =
            await this.#turmaDAO.findByField(
                "nomeTurma",
                nomeTratado
            );


        if (
            turmaPorNome &&
            turmaPorNome.length > 0
        ) {

            throw new ErrorResponse(
                400,
                "Turma já existe!",
                {
                    message:
                        `A turma ${nomeTratado} já existe.`
                }
            );

        }


        /* =====================================================
           CRIAR MODEL
        ===================================================== */

        const objTurmaModel =
            new Turma();


        objTurmaModel.nomeTurma =
            nomeTratado;


        objTurmaModel.idCurso =
            cursoId;


        console.log(
            "📦 Model da turma:",
            objTurmaModel
        );


        /* =====================================================
           SALVAR
           O idTurma será gerado automaticamente pelo MySQL
        ===================================================== */

        return this.#turmaDAO.create(
            objTurmaModel
        );

    };


    /* =========================================================
       LISTAR
    ========================================================= */

    findAll = async () => {

        console.log(
            "✅ TurmaService.findAll()"
        );


        return this.#turmaDAO.findAll();

    };


    /* =========================================================
       BUSCAR POR ID
    ========================================================= */

    findById = async (
        idTurma
    ) => {

        console.log(
            "✅ TurmaService.findById()"
        );


        return this.#turmaDAO.findById(
            idTurma
        );

    };


    /* =========================================================
       BUSCAR POR CAMPO
    ========================================================= */

    findByField = async (
        field,
        value
    ) => {

        console.log(
            "✅ TurmaService.findByField()"
        );


        const allowedFields = [

            "idTurma",

            "nomeTurma"

        ];


        if (
            !allowedFields.includes(field)
        ) {

            throw new Error(
                "Campo inválido para busca."
            );

        }


        return this.#turmaDAO.findByField(
            field,
            value
        );

    };


    /* =========================================================
       ATUALIZAR
    ========================================================= */

    updateTurma = async (
        TurmaJson,
        cursoCoordenadoLogado
    ) => {

        console.log(
            "✅ TurmaService.updateTurma()"
        );


        const {
            idTurma,
            nomeTurma,
            idCurso,
            Curso_idCurso
        } = TurmaJson;


        const turmaAtual =
            await this.#turmaDAO.findById(
                idTurma
            );


        if (!turmaAtual) {

            throw new Error(
                `Turma com ID ${idTurma} não encontrada!`
            );

        }


        /* =====================================================
           VERIFICAR CURSO DO COORDENADOR
        ===================================================== */

        if (
            cursoCoordenadoLogado !== undefined &&
            cursoCoordenadoLogado !== null &&
            Number(turmaAtual.Curso_idCurso) !==
                Number(cursoCoordenadoLogado)
        ) {

            throw new ErrorResponse(
                403,
                "Ação não permitida.",
                {
                    message:
                        "Você só pode editar turmas do curso que você coordena."
                }
            );

        }


        const curso =
            (
                cursoCoordenadoLogado !== undefined &&
                cursoCoordenadoLogado !== null
            )
                ? cursoCoordenadoLogado
                : (
                    idCurso !== undefined &&
                    idCurso !== null &&
                    idCurso !== ""
                        ? idCurso
                        : Curso_idCurso
                );


        const objTurmaModel =
            new Turma();


        objTurmaModel.idTurma =
            Number(idTurma);


        objTurmaModel.nomeTurma =
            nomeTurma !== undefined
                ? String(nomeTurma).trim()
                : turmaAtual.nomeTurma;


        objTurmaModel.idCurso =
            curso !== undefined &&
            curso !== null &&
            curso !== ""
                ? Number(curso)
                : turmaAtual.Curso_idCurso ||
                  turmaAtual.idCurso;


        return this.#turmaDAO.update(
            objTurmaModel
        );

    };


    /* =========================================================
       EXCLUIR
    ========================================================= */

    delete = async (
        idTurma
    ) => {

        console.log(
            "✅ TurmaService.delete()"
        );


        const objTurmaModel =
            new Turma();


        objTurmaModel.idTurma =
            Number(idTurma);


        return this.#turmaDAO.delete(
            objTurmaModel
        );

    };

};