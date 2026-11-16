const Disciplina = require("../../model/Disciplina");

const DisciplinaService = require("../../service/DisciplinaService");

const DisciplinaDAO = require("../../dao/DisciplinaDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const disciplinaDAO = new DisciplinaDAO(banco);

const disciplinaService = new DisciplinaService(disciplinaDAO);

const jsonDisciplinaTeste= {
    nomeDisciplina: "Poo1"
}

disciplinaService.createDisciplina(jsonDisciplinaTeste);