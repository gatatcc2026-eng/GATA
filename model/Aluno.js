const Turma = require("./Turma");
const Curso = require("./Curso");

module.exports = class Aluno {

    #matricula;
    #nome;
    #senha;
    #telefone;
    #email;
    #ano;
    #turma;
    #curso;

    constructor() {

        console.log("✅ Aluno.constructor()");

        this.#turma = new Turma();
        this.#curso = new Curso();
    }


    get matricula() {
        return this.#matricula;
    }

    set matricula(value) {

        const parsed = Number(value);

        if (!Number.isInteger(parsed)) {
            throw new Error(
                "🔺 Matricula deve ser um numero inteiro!!"
            );
        }

        if (String(value).length < 8) {
            throw new Error(
                "🔺 Matricula deve ter pelo menos 8 números!!"
            );
        }

        this.#matricula = parsed;
    }


    // =========================================================
    // ANO
    // =========================================================

    get ano() {
        return this.#ano;
    }

    set ano(value) {

        const parsed = Number(value);

        if (!Number.isInteger(parsed)) {
            throw new Error(
                "🔺 Ano deve ser um numero inteiro!!"
            );
        }

        if (parsed < 2025) {
            throw new Error(
                "🔺 Ano deve ser maior ou igual a 2025!!"
            );
        }

        if (String(value).length !== 4) {
            throw new Error(
                "🔺 O ano deve ter 4 casas decimais!!!"
            );
        }

        this.#ano = parsed;
    }


    // =========================================================
    // NOME
    // =========================================================

    get nome() {
        return this.#nome;
    }

    set nome(value) {

        if (typeof value !== "string") {
            throw new Error(
                "🔺 Nome do aluno deve ser uma String!"
            );
        }

        const nome = value.trim();

        if (nome.length < 3) {
            throw new Error(
                "🔺 Nome do aluno deve ter 3 caracteres pelo menos!"
            );
        }

        if (nome.length > 100) {
            throw new Error(
                "🔺 Nome do aluno não pode ultrapassar de 100 caracteres!"
            );
        }

        this.#nome = nome;
    }


    // =========================================================
    // SENHA
    // =========================================================

    get senha() {
        return this.#senha;
    }

    set senha(value) {

        if (typeof value !== "string") {
            throw new Error(
                "🔺 Senha precisa ser uma string!"
            );
        }

        const senha = value.trim();

        if (senha.length < 8) {
            throw new Error(
                "🔺 Senha precisa ter 8 caracteres!"
            );
        }

        const senhaBcrypt =
            /^\$2[aby]\$\d{2}\$.{53}$/;

        if (
            !/^\d+$/.test(senha) &&
            !senhaBcrypt.test(senha)
        ) {

            throw new Error(
                "🔺 Senha precisa conter apenas números!"
            );
        }

        this.#senha = senha;
    }


    // =========================================================
    // TELEFONE
    // =========================================================

    get telefone() {
        return this.#telefone;
    }

    set telefone(value) {

        if (typeof value !== "string") {
            throw new Error(
                "🔺 Telefone precisa ser uma string!"
            );
        }

        const telefone = value.trim();

        if (telefone.length < 11) {
            throw new Error(
                "🔺 Telefone precisa ter pelo menos 11 caracteres!"
            );
        }

        if (telefone.length > 12) {
            throw new Error(
                "🔺 Telefone precisa ter no máximo 12 caracteres!"
            );
        }

        this.#telefone = telefone;
    }


    // =========================================================
    // EMAIL
    // =========================================================

    get email() {
        return this.#email;
    }

    set email(value) {

        if (typeof value !== "string") {
            throw new Error(
                "🔺 Email precisa ser uma string!"
            );
        }

        const email = value.trim();

        if (email.length < 11) {
            throw new Error(
                "🔺 Email precisa ter pelo menos 11 caracteres!"
            );
        }

        if (email.length > 100) {
            throw new Error(
                "🔺 Email precisa ter no máximo 100 caracteres!"
            );
        }

        if (!email.endsWith("@gmail.com")) {
            throw new Error(
                "🔺 Email precisa terminar com @gmail.com!"
            );
        }

        this.#email = email;
    }


    // =========================================================
    // TURMA
    // =========================================================

    get turma() {
        return this.#turma;
    }

    set turma(value) {
        this.#turma = value;
    }


    // =========================================================
    // CURSO
    // =========================================================

    get curso() {
        return this.#curso;
    }

    set curso(value) {
        this.#curso = value;
    }
};