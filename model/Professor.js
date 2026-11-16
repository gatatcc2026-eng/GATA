module.exports = class Professor {

    #registro;
    #nome;
    #senha;
    #telefone1;
    #email1;
    #coordenador;
    #cursoCoordenado;

    constructor() {
        console.log("✅ Professor.constructor()");

        this.#cursoCoordenado = null;
    }

    // =========================================================
    // REGISTRO
    // =========================================================
    get registro() {
        return this.#registro;
    }

    set registro(value) {

        const parsed = Number(value);

        if (!Number.isInteger(parsed)) {
            throw new Error("🔺 Id do professor deve ser um número inteiro!");
        }

        if (parsed <= 0) {
            throw new Error("🔺 Id do professor deve ser um número maior do que zero!");
        }

        this.#registro = parsed;
    }

    // =========================================================
    // NOME
    // =========================================================
    get nome() {
        return this.#nome;
    }

    set nome(value) {

        if (typeof value !== "string") {
            throw new Error("🔺 Nome do professor precisa ser uma string!");
        }

        const nome = value.trim();

        if (nome.length < 3) {
            throw new Error("🔺 Nome do professor precisa ter pelo menos 3 caracteres!");
        }

        if (nome.length > 100) {
            throw new Error("🔺 Nome do professor precisa ter no máximo 100 caracteres!");
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
            throw new Error("🔺 Senha precisa ser uma string!");
        }

        const senha = value.trim();

        if (senha.length < 8) {
            throw new Error("🔺 Senha precisa ter pelo menos 8 caracteres!");
        }

        if (senha.length > 100) {
            throw new Error("🔺 Senha precisa ter no máximo 100 caracteres!");
        }

        /*
         * A senha que chega aqui deve ser a senha original
         * digitada pelo usuário (apenas números).
         * O bcrypt só é aplicado DEPOIS, no ProfessorService.
         */
        if (!/^\d+$/.test(senha)) {
            throw new Error("🔺 Senha precisa conter apenas números!");
        }

        this.#senha = senha;
    }

    // =========================================================
    // TELEFONE
    // =========================================================
    get telefone1() {
        return this.#telefone1;
    }

    set telefone1(value) {

        if (
            value === undefined ||
            value === null ||
            value.toString().trim() === ""
        ) {
            throw new Error("🔺 Telefone é obrigatório!");
        }

        const telefone1 = value.toString().replace(/\D/g, "");

        if (telefone1.length < 11) {
            throw new Error("🔺 Telefone precisa ter pelo menos 11 dígitos!");
        }

        if (telefone1.length > 12) {
            throw new Error("🔺 Telefone precisa ter no máximo 12 dígitos!");
        }

        this.#telefone1 = telefone1;
    }

    // =========================================================
    // EMAIL
    // =========================================================
    get email1() {
        return this.#email1;
    }

    set email1(value) {

        if (typeof value !== "string") {
            throw new Error("🔺 Email precisa ser uma string!");
        }

        const email1 = value.trim();

        if (email1.length < 11) {
            throw new Error("🔺 Email precisa ter pelo menos 11 caracteres!");
        }

        if (email1.length > 100) {
            throw new Error("🔺 Email precisa ter no máximo 100 caracteres!");
        }

        this.#email1 = email1;
    }

    // =========================================================
    // COORDENADOR
    // =========================================================
    get coordenador() {
        return this.#coordenador;
    }

    set coordenador(value) {

        if (typeof value === "boolean") {
            this.#coordenador = value;
            return;
        }

        if (
            value === 0 ||
            value === 1 ||
            value === "0" ||
            value === "1"
        ) {
            this.#coordenador = Boolean(Number(value));
            return;
        }

        throw new Error("🔺 Status de coordenação precisa ser true, false, 0 ou 1!");
    }

    // =========================================================
    // CURSO COORDENADO (nullable — só professores
    // coordenadores costumam ter isso preenchido)
    // =========================================================
    get cursoCoordenado() {
        return this.#cursoCoordenado;
    }

    set cursoCoordenado(value) {

        if (
            value === undefined ||
            value === null ||
            value === ""
        ) {
            this.#cursoCoordenado = null;
            return;
        }

        const parsed = Number(value);

        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new Error("🔺 Curso coordenado deve ser um id de curso válido!");
        }

        this.#cursoCoordenado = parsed;
    }
};