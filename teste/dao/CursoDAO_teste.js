

const Curso = require("../../model/Curso");

const CursoService = require("../../service/CursoService");

const CursoDAO = require("../../dao/CursoDAO");

const MysqlDatabase = require("../../database/MysqlDatabase");

const config = {}
const banco = new MysqlDatabase(config);
const cursoDAO = new CursoDAO(banco);

const curso = new Curso();

curso.idCurso = "1"
curso.nomeCurso = "ADM";

cursoDAO.findAll(curso);

//node CursoDAO_teste.js