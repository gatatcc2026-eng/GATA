const DisciplinaDAO = require("../dao/DisciplinaDAO");
const ProfessorDAO = require("../dao/ProfessorDAO");
const CursoDAO = require("../dao/CursoDAO");
const Disciplina = require("../model/Disciplina");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class DisciplinaService {

    #disciplinaDAO;
    #professorDAO;
    #cursoDAO;
    #professorCursoDAO;

    constructor(
        disciplinaDAODependency,
        professorDAODependency,
        cursoDAODependency,
        professorCursoDAODependency
    ) {

        console.log("✅ DisciplinaService.constructor()");

        this.#disciplinaDAO = disciplinaDAODependency;
        this.#professorDAO = professorDAODependency;
        this.#cursoDAO = cursoDAODependency;
        this.#professorCursoDAO = professorCursoDAODependency;
    }


    // =========================================================
    // VALIDAR PROFESSORES
    // - registro e turma válidos
    // - professor existe
    // - professor pertence ao curso da disciplina (professor_curso)
    // =========================================================
    #validarProfessores = async (professores, idCurso) => {

        if (!Array.isArray(professores)) {

            throw new ErrorResponse(
                400,
                "Professores inválidos!",
                { message: "A lista de professores deve ser um array." }
            );
        }


        for (const professor of professores) {

            // formato: { registro: 1234, idTurma: 1 }
            const registro = Number(professor.registro);
            const idTurma = Number(professor.idTurma);


            if (!Number.isInteger(registro) || registro <= 0) {

                throw new ErrorResponse(
                    400,
                    "Professor inválido!",
                    { message: "O registro do professor deve ser um número inteiro válido." }
                );
            }


            if (!Number.isInteger(idTurma) || idTurma <= 0) {

                throw new ErrorResponse(
                    400,
                    "Turma inválida!",
                    { message: "O ID da turma deve ser um número inteiro válido." }
                );
            }


            const resultadoProfessor =
                await this.#professorDAO.findByField("registro", registro);

            if (resultadoProfessor.length === 0) {

                throw new ErrorResponse(
                    400,
                    "Professor não encontrado!",
                    { message: `O professor com registro ${registro} não existe!` }
                );
            }


            const vinculado =
                await this.#professorCursoDAO.existeVinculo(registro, idCurso);

            if (!vinculado) {

                throw new ErrorResponse(
                    400,
                    "Professor de outro curso!",
                    {
                        message:
                            `O professor ${resultadoProfessor[0].nome} (registro ${registro}) não pertence ao curso da disciplina. Use "Adicionar professor existente" para trazê-lo para o curso.`
                    }
                );
            }
        }
    };


    // =========================================================
    // CRIAR DISCIPLINA
    // =========================================================

    createDisciplina = async (DisciplinaJson) => {

        console.log("✅ DisciplinaService.createDisciplina()");

        const objDisciplinaModel = new Disciplina();

        objDisciplinaModel.idDisciplina = DisciplinaJson.idDisciplina;
        objDisciplinaModel.nomeDisciplina = DisciplinaJson.nomeDisciplina;


        // CURSO OBRIGATÓRIO
        if (!DisciplinaJson.Curso_idCurso) {

            throw new ErrorResponse(
                400,
                "Curso obrigatório!",
                { message: "Selecione o curso da disciplina." }
            );
        }

        objDisciplinaModel.Curso_idCurso = Number(DisciplinaJson.Curso_idCurso);


        // PROFESSORES (aceita "professores" array ou o antigo "professor")
        const listaProfessores =
            Array.isArray(DisciplinaJson.professores)
                ? DisciplinaJson.professores
                : DisciplinaJson.professor !== undefined
                    ? [DisciplinaJson.professor]
                    : [];

        if (listaProfessores.length === 0) {

            throw new ErrorResponse(
                400,
                "Professor obrigatório!",
                { message: "Selecione pelo menos um professor para a disciplina." }
            );
        }

        objDisciplinaModel.professores = listaProfessores;


        // DISCIPLINA JÁ EXISTE?
        const resultadoDisciplina =
            await this.#disciplinaDAO.findByField(
                "nomeDisciplina",
                objDisciplinaModel.nomeDisciplina
            );

        if (resultadoDisciplina.length > 0) {

            throw new ErrorResponse(
                400,
                "Disciplina já existe!",
                { message: `A Disciplina ${objDisciplinaModel.nomeDisciplina} já existe!` }
            );
        }


        // CURSO EXISTE?
        const resultadoCurso =
            await this.#cursoDAO.findById(objDisciplinaModel.Curso_idCurso);

        if (!resultadoCurso) {

            throw new ErrorResponse(
                400,
                "Curso não encontrado!",
                { message: `O curso com ID ${objDisciplinaModel.Curso_idCurso} não existe!` }
            );
        }


        // PROFESSORES (existem e são do curso)
        await this.#validarProfessores(
            objDisciplinaModel.professores,
            objDisciplinaModel.Curso_idCurso
        );


        return this.#disciplinaDAO.create(objDisciplinaModel);
    };


    // =========================================================
    // LISTAR
    // =========================================================

    findAll = async () => {

        console.log("✅ DisciplinaService.findAll()");

        return this.#disciplinaDAO.findAll();
    };


    // =========================================================
    // BUSCAR POR ID
    // =========================================================

    findById = async (idDisciplina) => {

        console.log("✅ DisciplinaService.findById()");

        return this.#disciplinaDAO.findById(idDisciplina);
    };


    // =========================================================
    // BUSCAR POR CAMPO
    // =========================================================

    findByField = async (field, value) => {

        console.log("✅ DisciplinaService.findByField()");

        const allowedFields = [
            "idDisciplina",
            "nomeDisciplina",
            "Curso_idCurso"
        ];

        if (!allowedFields.includes(field)) {

            throw new Error("Campo inválido para busca.");
        }

        return this.#disciplinaDAO.findByField(field, value);
    };


    // =========================================================
    // DISCIPLINAS DE UM PROFESSOR
    // =========================================================

    findByProfessor = async (registroProfessor) => {

        console.log("✅ DisciplinaService.findByProfessor()");

        return this.#disciplinaDAO.findByProfessor(registroProfessor);
    };


    // =========================================================
    // ATUALIZAR
    //
    // Campos não enviados mantêm o valor atual.
    // =========================================================

    updateDisciplina = async (DisciplinaJson) => {

        console.log("✅ DisciplinaService.updateDisciplina()");

        const {
            idDisciplina,
            nomeDisciplina,
            professores,
            professor,
            Curso_idCurso
        } = DisciplinaJson;


        const DisciplinaAtual =
            await this.#disciplinaDAO.findById(idDisciplina);

        if (!DisciplinaAtual) {

            throw new Error(`Disciplina com ID ${idDisciplina} não encontrada!`);
        }


        const objDisciplinaModel = new Disciplina();

        objDisciplinaModel.idDisciplina = Number(idDisciplina);

        objDisciplinaModel.nomeDisciplina =
            nomeDisciplina ?? DisciplinaAtual.nomeDisciplina;


        // CURSO
        const cursoFinal = Curso_idCurso ?? DisciplinaAtual.Curso_idCurso;

        if (!cursoFinal) {

            throw new ErrorResponse(
                400,
                "Curso obrigatório!",
                { message: "Selecione o curso da disciplina." }
            );
        }

        objDisciplinaModel.Curso_idCurso = Number(cursoFinal);


        // PROFESSORES
        objDisciplinaModel.professores =
            Array.isArray(professores)
                ? professores
                : professor !== undefined
                    ? [professor]
                    : DisciplinaAtual.professores;


        // CURSO EXISTE?
        const resultadoCurso =
            await this.#cursoDAO.findById(objDisciplinaModel.Curso_idCurso);

        if (!resultadoCurso) {

            throw new ErrorResponse(
                400,
                "Curso não encontrado!",
                { message: "O curso selecionado não existe." }
            );
        }


        // PROFESSORES (existem e são do curso)
        await this.#validarProfessores(
            objDisciplinaModel.professores,
            objDisciplinaModel.Curso_idCurso
        );


        return this.#disciplinaDAO.update(objDisciplinaModel);
    };


    // =========================================================
    // EXCLUIR
    // =========================================================

    delete = async (idDisciplina) => {

        console.log("✅ DisciplinaService.delete()");

        const objDisciplinaModel = new Disciplina();

        objDisciplinaModel.idDisciplina = idDisciplina;

        return this.#disciplinaDAO.delete(objDisciplinaModel);
    };

};