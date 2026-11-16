console.log("ola mundo")

const AlunoDisciplinaProfessor = require("../../model/AlunoDisciplinaProfessor");

const AlunoDisciplinaProfessorService = require("../../service/AlunoDisciplinaProfessorService");

const AlunoDisciplinaProfessorDAO = require("../../dao/AlunoDisciplinaProfessorDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const alunoDisciplinaProfessorDAO = new AlunoDisciplinaProfessorDAO(banco);

const alunoDisciplinaProfessor = new AlunoDisciplinaProfessor(alunoDisciplinaProfessorDAO);

alunoDisciplinaProfessor.idAlunoDisciplinaProfessor = "2";
alunoDisciplinaProfessor.disciplina.idDisciplina = "405";
alunoDisciplinaProfessor.aluno.matricula = "50240663";

alunoDisciplinaProfessorDAO.delete(alunoDisciplinaProfessor);

//node alunoDisciplinaProfessorDAO_teste.js