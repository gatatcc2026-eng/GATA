module.exports = class Curso {
    #idCurso;
    #nomeCurso;
    
    
    constructor(){
        console.log("✅ Curso.constructor()");
    }
    
    get idCurso(){
        return this.#idCurso;
    }
    
    set idCurso(value){
        const parsed = Number(value);
        if(!Number.isInteger(parsed))
            throw new Error("🔺 Id do curso deve ser um número inteiro!!");
        if(parsed <= 0)
            throw new Error("🔺 Id do curso deve ser não pode ser ZERO!!");
        this.#idCurso = parsed;
    }

    get nomeCurso(){
        return this.#nomeCurso;
    }

    set nomeCurso(value){
        if(typeof value != "string")
            throw new Error("🔺 Nome do curso deve ser uma String!");
        const nomeCurso = value.trim();
        if (nomeCurso.length<3)
            throw new Error("🔺 Nome do curso deve ter 3 caracteres pelo menos!");
        if(nomeCurso.length>100)
            throw new Error("🔺 Nome do curso não pode ultrapassar de 100 caracteres!");
        this.#nomeCurso = nomeCurso;
    }
}