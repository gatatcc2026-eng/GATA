module.exports = class ConfiguracaoNotasDAO {

    #database;


    constructor(databaseInstance) {

        console.log(
            "✅ ConfiguracaoNotasDAO.constructor() (por curso)"
        );

        this.#database =
            databaseInstance;
    }


    // =========================================================
    // BUSCAR CONFIGURAÇÃO DE UM CURSO
    // =========================================================

    findConfig = async (idCurso) => {

        console.log(
            "🟢 ConfiguracaoNotasDAO.findConfig():",
            idCurso
        );


        const SQL = `
            SELECT
                idCurso,
                notasFechadas,
                fechadoPor,
                atualizadoEm
            FROM configuracaonotascurso
            WHERE idCurso = ?
            LIMIT 1
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [
                    Number(idCurso)
                ]
            );


        if (
            !resultado ||
            resultado.length === 0
        ) {

            return null;
        }


        return resultado[0];
    };


    // =========================================================
    // CURSOS COM AS NOTAS FECHADAS
    // =========================================================

    listarCursosFechados = async () => {

        console.log(
            "🟢 ConfiguracaoNotasDAO.listarCursosFechados()"
        );


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                "SELECT idCurso FROM configuracaonotascurso WHERE notasFechadas = 1"
            );


        return resultado.map(
            linha => Number(linha.idCurso)
        );
    };


    // =========================================================
    // FECHAR / LIBERAR AS NOTAS DE UM CURSO
    // =========================================================

    updateStatus = async (
        idCurso,
        notasFechadas,
        registro
    ) => {

        console.log(
            "🟢 ConfiguracaoNotasDAO.updateStatus():",
            idCurso,
            notasFechadas,
            registro
        );


        const SQL = "INSERT INTO configuracaonotascurso (idCurso, notasFechadas, fechadoPor) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE notasFechadas = VALUES(notasFechadas), fechadoPor = VALUES(fechadoPor)";


        const pool =
            await this.#database.getPool();


        await pool.execute(
            SQL,
            [
                Number(idCurso),
                notasFechadas,
                registro
            ]
        );


        return true;
    };


    // =========================================================
    // CURSO DA DISCIPLINA DE UM VÍNCULO ALUNO/DISCIPLINA
    // =========================================================

    cursoDoVinculo = async (idAdp) => {

        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                `
                SELECT d.Curso_idCurso
                FROM alunodisciplinaprofessor adp
                INNER JOIN disciplina d
                    ON d.idDisciplina = adp.Disciplina_idDisciplina
                WHERE adp.idAlunoDisciplinaProfessor = ?
                LIMIT 1
                `,
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
    // CURSO DA DISCIPLINA DE UMA NOTA
    // =========================================================

    cursoDaNota = async (idNota) => {

        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                `
                SELECT d.Curso_idCurso
                FROM nota n
                INNER JOIN alunodisciplinaprofessor adp
                    ON adp.idAlunoDisciplinaProfessor =
                       n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor
                INNER JOIN disciplina d
                    ON d.idDisciplina = adp.Disciplina_idDisciplina
                WHERE n.idNota = ?
                LIMIT 1
                `,
                [
                    Number(idNota)
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

};