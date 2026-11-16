const AlunoDisciplinaProfessor = require("../../model/AlunoDisciplinaProfessor");

const AlunoDisciplinaProfessorService = require("../../service/AlunoDisciplinaProfessorService");

const AlunoDisciplinaProfessorDAO = require("../../dao/AlunoDisciplinaProfessorDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const alunoDisciplinaProfessorDAO = new AlunoDisciplinaProfessorDAO(banco);

const alunoDisciplinaProfessorService = new AlunoDisciplinaProfessorService(alunoDisciplinaProfessorDAO);

const jsonAlunoDisciplinaProfessorTeste= {
    nomeAlunoDisciplinaProfessor: "1"
}

alunoDisciplinaProfessorService.createAlunoDisciplinaProfessor(jsonAlunoDisciplinaProfessorTeste);