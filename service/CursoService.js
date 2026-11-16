const CursoDAO = require("../dao/CursoDAO");
const Curso = require("../model/Curso");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class CursoService {
    #cursoDAO;

    /**
     * @param {CursoDAO} cursoDAODependency
     */
    constructor(cursoDAODependency) {
        console.log("✅ CursoService.constructor()");
        this.#cursoDAO = cursoDAODependency;
    }

    createCurso = async (CursoJson) => {
        console.log("✅ CursoService.createCurso()");
        const objCursoModel = new Curso();

        objCursoModel.nomeCurso = CursoJson.nomeCurso;
        const resultado = await this.#cursoDAO.findByField('nomeCurso', objCursoModel.nomeCurso);
        if (resultado.length > 0) {
            throw new ErrorResponse(
                400,
                "Curso já existe!",
                { message: `O Curso ${objCursoModel.nomeCurso} já existe!` }
            );
        }
        return this.#cursoDAO.create(objCursoModel);
    };

    findAll = async () => {
        console.log("✅ CursoService.findAll()");
        return this.#cursoDAO.findAll();
    };

    findById = async (idCurso) => {
        console.log("✅ CursoService.findById()");
        return this.#cursoDAO.findById(idCurso);
    };

    findByField = async (field, value) => {
        console.log("✅ CursoService.findByField()");
        const allowedFields = ["idCurso", "nomeCurso"];
        if (!allowedFields.includes(field)) {
            throw new Error("Campo inválido para busca.");
        }
        return this.#cursoDAO.findByField(field, value);
    };

    updateCurso = async (CursoJson) => {
        console.log("✅ CursoService.updateCurso()");

        const { idCurso, nomeCurso } = CursoJson;

        if (!idCurso) {
            throw new Error("ID do curso é obrigatório!");
        }

        const CursoAtual = await this.#cursoDAO.findById(idCurso);

        if (!CursoAtual) {
            throw new Error(`Curso com ID ${idCurso} não encontrado!`);
        }

        const objCursoModel = new Curso();
        objCursoModel.idCurso = idCurso;
        objCursoModel.nomeCurso = nomeCurso ?? CursoAtual.nomeCurso;

        return this.#cursoDAO.update(objCursoModel);
    };

    delete = async (idCurso) => {
        console.log("✅ CursoService.delete()");

        const cursoAtual = await this.#cursoDAO.findById(idCurso);

        if (!cursoAtual) {
            throw new ErrorResponse(
                404,
                "Curso não encontrado!",
                { message: `Curso com ID ${idCurso} não encontrado!` }
            );
        }

        const objCursoModel = new Curso();
        objCursoModel.idCurso = idCurso;

        try {
            return await this.#cursoDAO.delete(objCursoModel);
        } catch (erro) {
            // 1451 = ER_ROW_IS_REFERENCED_2 (FK impede a exclusão)
            if (erro?.errno === 1451 || erro?.code === "ER_ROW_IS_REFERENCED_2") {
                throw new ErrorResponse(
                    409,
                    "Não é possível excluir este curso.",
                    { message: this.#montarMensagemVinculo(cursoAtual.nomeCurso, erro) }
                );
            }
            throw erro;
        }
    };

    /**
     * Converte o erro de FK do MySQL numa mensagem legível,
     * lendo o nome da tabela que ainda referencia o curso.
     */
    #montarMensagemVinculo = (nomeCurso, erro) => {
        const rotulos = {
            aluno: "alunos",
            turma: "turmas",
            disciplina: "disciplinas",
            professor: "professores que coordenam este curso",
            professor_curso: "professores vinculados a este curso",
            solicitacaoprofessor: "solicitações de professor",
            solicitacaotransferencia: "solicitações de transferência de aluno"
        };

        const encontrado = /`[^`]+`\.`([^`]+)`/.exec(erro?.sqlMessage || erro?.message || "");
        const tabela = encontrado ? encontrado[1].toLowerCase() : null;
        const rotulo = rotulos[tabela] || (tabela ? `registros da tabela "${tabela}"` : "outros registros");

        return `O curso ${nomeCurso} ainda possui ${rotulo} vinculados. ` +
               `Remova ou transfira esses vínculos antes de excluir o curso.`;
    };
};