const Professor = require("../../model/Professor");

const ProfessorService = require("../../service/ProfessorService");

const ProfessorDAO = require("../../dao/ProfessorDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const professorDAO = new ProfessorDAO(banco);

const professorService = new ProfessorService(professorDAO);

const jsonProfessorTeste= {
    registro: 509876,
    nome: "Kakui",
    senha: "12345678",
    telefone1: "12996396575",
    telefone2: "12996396579",
    email1:"anaclae@gmail.com",
    email2:"jdfbdhbfhbd@gmail.com"
}

professorService.createProfessor(jsonProfessorTeste);

//node ProfessorService_teste.js

