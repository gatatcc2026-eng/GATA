

const Disciplina = require("../../model/Disciplina");

const DisciplinaService = require("../../service/DisciplinaService");

const DisciplinaDAO = require("../../dao/DisciplinaDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const disciplinaDAO = new DisciplinaDAO(banco);

const disciplina = new Disciplina();

disciplina.nomeDisciplina = "Testando";
disciplina.professor.registro = 5807;
disciplina.idDisciplina = "404";



disciplinaDAO.delete(disciplina);

//node DisciplinaDAO_teste.js