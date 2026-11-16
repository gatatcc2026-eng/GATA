const AlunoDisciplinaProfessor = require("./AlunoDisciplinaProfessor");

module.exports = class Nota {

    #idNota;
    #nota;
    #bimestre;
    #alunoDisciplinaProfessor;

    constructor() {

        console.log("✅ Nota.constructor()");

        this.#alunoDisciplinaProfessor =
            new AlunoDisciplinaProfessor();
    }

    /* ================================================= */
    /* ID NOTA */
    /* ================================================= */

    get idNota() {
        return this.#idNota;
    }

    set idNota(value) {

        const parsed = Number(value);

        if (!Number.isInteger(parsed)) {

            throw new Error(
                "🔺 Id da nota deve ser um número inteiro!!"
            );
        }

        if (parsed <= 0) {

            throw new Error(
                "🔺 Id da nota não pode ser ZERO!!"
            );
        }

        this.#idNota = parsed;
    }

    /* ================================================= */
    /* NOTA */
    /* ================================================= */

    get nota() {
        return this.#nota;
    }

    set nota(value) {

        const parsed = Number(value);

        if (Number.isNaN(parsed)) {

            throw new Error(
                "🔺 A nota precisa ser um número!!"
            );
        }

        if (parsed < 0 || parsed > 10) {

            throw new Error(
                "🔺 Nota abaixo de zero ou acima de dez!!"
            );
        }

        this.#nota = parsed;
    }

    /* ================================================= */
    /* BIMESTRE */
    /* ================================================= */

    get bimestre() {
        return this.#bimestre;
    }

    set bimestre(value) {
        const parsed = Number.isInteger(Number(value))
            ? Number(value)
            : parseInt(String(value).charAt(0));

        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) {
            throw new Error("🔺 Bimestre inexistente!!");
        }

        this.#bimestre = `${parsed}º Bimestre`;
    }

    /* ================================================= */
    /* ALUNO DISCIPLINA PROFESSOR */
    /* ================================================= */

    get alunoDisciplinaProfessor() {
        return this.#alunoDisciplinaProfessor;
    }

    set alunoDisciplinaProfessor(value) {
        this.#alunoDisciplinaProfessor = value;
    }
};