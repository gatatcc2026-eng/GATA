module.exports = class Turma {

    #idTurma;
    #nomeTurma;
    #idCurso;

    constructor() {
        console.log("✅ Turma.constructor()");
    }

    get idTurma() {
        return this.#idTurma;
    }

    set idTurma(value) {

        const parsed = Number(value);

        if (!Number.isInteger(parsed)) {
            throw new Error(
                "🔺 ID da turma deve ser um número inteiro!"
            );
        }

        if (parsed <= 0) {
            throw new Error(
                "🔺 ID da turma deve ser maior que zero!"
            );
        }

        this.#idTurma = parsed;
    }


    get nomeTurma() {
        return this.#nomeTurma;
    }

    set nomeTurma(value) {

        if (typeof value !== "string") {
            throw new Error(
                "🔺 Nome da turma precisa ser uma string!"
            );
        }

        const nome = value.trim();

        if (nome.length < 2) {
            throw new Error(
                "🔺 Nome da turma precisa ter pelo menos 2 caracteres!"
            );
        }

        if (nome.length > 100) {
            throw new Error(
                "🔺 Nome da turma precisa ter no máximo 100 caracteres!"
            );
        }

        this.#nomeTurma = nome;
    }


    get idCurso() {
        return this.#idCurso;
    }

    set idCurso(value) {

        const parsed = Number(value);

        if (!Number.isInteger(parsed)) {
            throw new Error(
                "🔺 ID do curso deve ser um número inteiro!"
            );
        }

        if (parsed <= 0) {
            throw new Error(
                "🔺 ID do curso deve ser maior que zero!"
            );
        }

        this.#idCurso = parsed;
    }

};