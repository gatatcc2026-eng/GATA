module.exports = class Disciplina {

    #idDisciplina;
    #nomeDisciplina;
    #professores;
    #Curso_idCurso;

    constructor() {

        console.log("✅ Disciplina.constructor()");

        this.#professores = [];
    }


    // =========================================================
    // ID DISCIPLINA
    // =========================================================

    get idDisciplina() {
        return this.#idDisciplina;
    }


    set idDisciplina(value) {

        const parsed = Number(value);

        if (!Number.isInteger(parsed)) {
            throw new Error(
                "🔺 Id da disciplina deve ser um número inteiro!!"
            );
        }

        if (parsed <= 0) {
            throw new Error(
                "🔺 Id da disciplina não pode ser ZERO!!"
            );
        }

        this.#idDisciplina = parsed;
    }


    // =========================================================
    // NOME DISCIPLINA
    // =========================================================

    get nomeDisciplina() {
        return this.#nomeDisciplina;
    }


    set nomeDisciplina(value) {

        if (typeof value !== "string") {
            throw new Error(
                "🔺 Nome da disciplina deve ser uma String!"
            );
        }

        const nomeDisciplina = value.trim();

        if (nomeDisciplina.length < 3) {
            throw new Error(
                "🔺 Nome da disciplina deve ter 3 caracteres pelo menos!"
            );
        }

        if (nomeDisciplina.length > 100) {
            throw new Error(
                "🔺 Nome da disciplina não pode ultrapassar de 100 caracteres!"
            );
        }

        this.#nomeDisciplina = nomeDisciplina;
    }


    // =========================================================
    // PROFESSORES
    //
    // Cada professor possui:
    //
    // {
    //     registro: 1234,
    //     idTurma: 1
    // }
    //
    // =========================================================

    get professores() {
        return this.#professores;
    }


    set professores(value) {

    if (
        !Array.isArray(value)
    ) {

        throw new Error(
            "🔺 Professores da disciplina deve ser uma lista!"
        );

    }


    if (
        value.length === 0
    ) {

        throw new Error(
            "🔺 A disciplina precisa ter pelo menos um professor!"
        );

    }


    const vinculos =
        value.map(
            vinculo => {

                if (
                    typeof vinculo !== "object" ||
                    vinculo === null
                ) {

                    throw new Error(
                        "🔺 O vínculo do professor deve conter registro e turma!"
                    );

                }


                const registro =
                    Number(
                        vinculo.registro
                    );


                const idTurma =
                    Number(
                        vinculo.idTurma
                    );


                if (
                    !Number.isInteger(registro) ||
                    registro <= 0
                ) {

                    throw new Error(
                        "🔺 O registro do professor deve ser um número inteiro válido!"
                    );

                }


                if (
                    !Number.isInteger(idTurma) ||
                    idTurma <= 0
                ) {

                    throw new Error(
                        "🔺 A turma do professor deve ser um número inteiro válido!"
                    );

                }


                return {

                    registro:
                        registro,

                    idTurma:
                        idTurma

                };

            }
        );

    const mapa =
        new Map();


    vinculos.forEach(
        vinculo => {

            const chave =
                `${vinculo.registro}-${vinculo.idTurma}`;


            mapa.set(
                chave,
                vinculo
            );

        }
    );


    this.#professores =
        Array.from(
            mapa.values()
        );

}


    // =========================================================
    // CURSO
    // =========================================================

    get Curso_idCurso() {
        return this.#Curso_idCurso;
    }


    set Curso_idCurso(value) {

        const parsed =
            Number(value);


        if (
            !Number.isInteger(parsed) ||
            parsed <= 0
        ) {

            throw new Error(
                "🔺 O curso da disciplina é obrigatório!"
            );

        }


        this.#Curso_idCurso =
            parsed;
    }

};