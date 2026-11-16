const Aluno = require("./Aluno");
const AlunoDisciplinaProfessor = require("./AlunoDisciplinaProfessor");
const Curso = require("./Curso"); //OK
const Disciplina = require("./Disciplina");//OK
const Nota = require("./Nota");//OK
const Professor = require("./Professor");
const Turma = require("./Turma"); //OK

const professor = new Professor();
const alunoDisciplinaProfessor = new AlunoDisciplinaProfessor();
alunoDisciplinaProfessor.aluno.matricula = 3.5;

console.log(alunoDisciplinaProfessor.aluno.matricula);

