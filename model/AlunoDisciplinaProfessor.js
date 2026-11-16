const Disciplina = require("./Disciplina");
const Aluno = require("./Aluno");
module.exports = class AlunoDisciplinaProfessor {
    #idAlunoDisciplinaProfessor;
    #disciplina;
    #aluno;

    constructor(){
        console.log("✅ AlunoDisciplinaProfessor.constructor()");
        this.#disciplina = new Disciplina();
        this.#aluno = new Aluno();
    }

 
    get idAlunoDisciplinaProfessor(){
        return this.#idAlunoDisciplinaProfessor;
    }

    set idAlunoDisciplinaProfessor(value){
        const parsed = Number(value);
        if(!Number.isInteger(parsed))
            throw new Error("🔺 Id deve ser um número inteiro!");
        if(parsed <= 0)
            throw new Error("🔺 Id não pode ser ZERO ou negativo!");
        this.#idAlunoDisciplinaProfessor = parsed;
    }


    get disciplina(){
        return this.#disciplina;
    }

    set disciplina(value){
        this.#disciplina = value;
    }


    get aluno(){
        return this.#aluno;
    }

    set aluno(value){
        this.#aluno = value;
    }
}
