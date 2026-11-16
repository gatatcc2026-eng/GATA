const Curso = require("../../model/Curso");

const CursoService = require("../../service/CursoService");

const CursoDAO = require("../../dao/CursoDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const cursoDAO = new CursoDAO(banco);

const cursoService = new CursoService(cursoDAO);

const jsonCursoTeste= {
    idCurso: 1,
    nomeCurso: "ADM"
}


cursoService.delete(jsonCursoTeste.idCurso);

//node CursoService_teste.js