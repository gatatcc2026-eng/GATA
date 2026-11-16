const AlunoDisciplinaProfessorDAO = require("../dao/AlunoDisciplinaProfessorDAO");
const AlunoDisciplinaProfessor = require("../model/AlunoDisciplinaProfessor");

module.exports = class AlunoDisciplinaProfessorService{
    #alunoDisciplinaProfessorDAO;

    constructor(AlunoDisciplinaProfessorDAODependency){
        console.log("✅ AlunoDisciplinaProfessorService.constructor()");
        this.#alunoDisciplinaProfessorDAO = AlunoDisciplinaProfessorDAODependency;
    }

    createAlunoDisciplinaProfessor = async (AlunoDisciplinaProfessorJson) => {
        console.log("✅ AlunoDisciplinaProfessorService.createAlunoDisciplinaProfessor()");
    
        const objAlunoDisciplinaProfessorModel = new AlunoDisciplinaProfessor();
    
        objAlunoDisciplinaProfessorModel.disciplina.idDisciplina = AlunoDisciplinaProfessorJson.idDisciplina;
        objAlunoDisciplinaProfessorModel.aluno.matricula = AlunoDisciplinaProfessorJson.matricula;
    
        return this.#alunoDisciplinaProfessorDAO.create(objAlunoDisciplinaProfessorModel);
    }

    findAll = async () =>{
        console.log("✅ AlunoDisciplinaProfessorService.findAll()");
        return this.#alunoDisciplinaProfessorDAO.findAll();
    }

    findById = async (idAlunoDisciplinaProfessor) =>{
        console.log("✅ AlunoDisciplinaProfessorService.findById()");
        return this.#alunoDisciplinaProfessorDAO.findById(idAlunoDisciplinaProfessor);
    }

    findByField = async (field, value) => {
        console.log("✅ AlunoDisciplinaProfessorService.findByField()");

        const allowedFields = [
            "idAlunoDisciplinaProfessor",
            "Disciplina_idDisciplina",
            "Aluno_matricula"
        ];

        if (!allowedFields.includes(field)) {
            throw new Error("Campo inválido para busca.");
        }

        return this.#alunoDisciplinaProfessorDAO.findByField(field, value);
    }

    updateAlunoDisciplinaProfessor = async (AlunoDisciplinaProfessorJson) => {
        console.log("✅ AlunoDisciplinaProfessorService.updateAlunoDisciplinaProfessorService()");
        const { idAlunoDisciplinaProfessor, idDisciplina, matricula } = AlunoDisciplinaProfessorJson;
        const alunoDisciplinaProfessorAtual = await this.#alunoDisciplinaProfessorDAO.findById(idAlunoDisciplinaProfessor);

        if (!alunoDisciplinaProfessorAtual) {
            throw new Error(`AlunoDisciplinaProfessor com ID ${idAlunoDisciplinaProfessor} não encontrado!`);
        }

        const objAlunoDisciplinaProfessorModel = new AlunoDisciplinaProfessor();
        objAlunoDisciplinaProfessorModel.idAlunoDisciplinaProfessor = idAlunoDisciplinaProfessor;
        objAlunoDisciplinaProfessorModel.disciplina.idDisciplina = idDisciplina ?? alunoDisciplinaProfessorAtual.disciplina.idDisciplina;
        objAlunoDisciplinaProfessorModel.aluno.matricula = matricula ?? alunoDisciplinaProfessorAtual.aluno.matricula;

        return this.#alunoDisciplinaProfessorDAO.update(objAlunoDisciplinaProfessorModel);
    }

    deleteAlunoDisciplinaProfessor = async (idAlunoDisciplinaProfessor) => {
        console.log("✅ AlunoDisciplinaPRofessorService.delete()")

        const objAlunoDisciplinaProfessorModel = new AlunoDisciplinaProfessor();
        objAlunoDisciplinaProfessorModel.idAlunoDisciplinaProfessor = idAlunoDisciplinaProfessor;
        return this.#alunoDisciplinaProfessorDAO.delete(objAlunoDisciplinaProfessorModel);  
    }
}