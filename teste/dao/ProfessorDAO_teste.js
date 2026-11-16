

const Professor = require("../../model/Professor");

const ProfessorService = require("../../service/ProfessorService");

const ProfessorDAO = require("../../dao/ProfessorDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const professorDAO = new ProfessorDAO(banco);

const professor = new Professor();
professor.registro = "05857";
professor.nome = "cagao";
professor.senha = "Abcedario";
professor.telefone1 = "129296396575";
professor.telefone2 = "129296396475";
professor.email1 = "ANA@gmail.com";
professor.email2 = "fjjuaj@gmail.com";

professorDAO.update(professor);

//node ProfessorDAO_teste.js