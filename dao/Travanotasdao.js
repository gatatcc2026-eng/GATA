module.exports = class TravaNotasDAO {

    #database;


    // =========================================================
    // CONSTRUTOR
    // =========================================================

    constructor(databaseInstance) {

        console.log(
            "✅ TravaNotasDAO.constructor()"
        );

        this.#database =
            databaseInstance;
    }


    // =========================================================
    // CURSO DA DISCIPLINA DE UM VÍNCULO ALUNO/DISCIPLINA
    // =========================================================

    cursoDaAdp = async (idAdp) => {

        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                "SELECT d.Curso_idCurso FROM alunodisciplinaprofessor adp INNER JOIN disciplina d ON d.idDisciplina = adp.Disciplina_idDisciplina WHERE adp.idAlunoDisciplinaProfessor = ? LIMIT 1",
                [
                    Number(idAdp)
                ]
            );


        if (
            !resultado ||
            resultado.length === 0
        ) {

            return null;
        }


        return Number(
            resultado[0].Curso_idCurso
        );
    };


    // =========================================================
    // AS NOTAS DESTE CURSO ESTÃO FECHADAS?
    // =========================================================

    notasFechadas = async (idCurso) => {

        const curso =
            Number(idCurso);

        if (
            !Number.isInteger(curso) ||
            curso <= 0
        ) {

            return false;
        }


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                "SELECT notasFechadas FROM configuracaonotascurso WHERE idCurso = ? LIMIT 1",
                [
                    curso
                ]
            );


        if (
            !resultado ||
            resultado.length === 0
        ) {

            return false;
        }


        return (
            Number(
                resultado[0].notasFechadas
            ) === 1
        );
    };


    // =========================================================
    // FECHAR / LIBERAR AS NOTAS DE UM CURSO
    // =========================================================

    definirTrava = async (idCurso, fechada) => {

        console.log(
            "🟢 TravaNotasDAO.definirTrava():",
            idCurso,
            fechada
        );


        const pool =
            await this.#database.getPool();


        await pool.execute(
            "INSERT INTO configuracaonotascurso (idCurso, notasFechadas) VALUES (?, ?) ON DUPLICATE KEY UPDATE notasFechadas = VALUES(notasFechadas)",
            [
                Number(idCurso),
                fechada ? 1 : 0
            ]
        );


        return fechada ? true : false;
    };

};