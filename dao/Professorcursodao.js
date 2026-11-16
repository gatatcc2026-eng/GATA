const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class ProfessorCursoDAO {

    #database;


    constructor(databaseInstance) {

        console.log(
            "✅ ProfessorCursoDAO.constructor()"
        );

        this.#database =
            databaseInstance;
    }


    // =========================================================
    // VINCULAR PROFESSOR A UM CURSO (idempotente)
    // =========================================================

    vincular = async (registro, idCurso) => {

        console.log(
            "🟢 ProfessorCursoDAO.vincular():",
            registro,
            idCurso
        );


        const SQL = "INSERT IGNORE INTO professor_curso (registro, idCurso) VALUES (?, ?)";


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [
                    registro,
                    idCurso
                ]
            );


        return resultado.affectedRows > 0;
    };


    // =========================================================
    // DESVINCULAR PROFESSOR DE UM CURSO
    // (o trigger bloqueia se ele ainda leciona no curso ou se
    // é o curso que ele coordena)
    // =========================================================

    desvincular = async (registro, idCurso) => {

        console.log(
            "🟢 ProfessorCursoDAO.desvincular():",
            registro,
            idCurso
        );


        const SQL = "DELETE FROM professor_curso WHERE registro = ? AND idCurso = ?";


        const pool =
            await this.#database.getPool();


        try {

            const [
                resultado
            ] =
                await pool.execute(
                    SQL,
                    [
                        registro,
                        idCurso
                    ]
                );


            return resultado.affectedRows > 0;

        } catch (error) {

            if (error.sqlState === "45000") {

                throw new ErrorResponse(
                    409,
                    error.sqlMessage ||
                    "Não foi possível remover o vínculo."
                );
            }

            throw error;
        }
    };


    // =========================================================
    // O PROFESSOR ESTÁ VINCULADO AO CURSO?
    // =========================================================

    existeVinculo = async (registro, idCurso) => {

        const SQL = `
            SELECT 1
            FROM professor_curso
            WHERE registro = ?
              AND idCurso = ?
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
                    registro,
                    idCurso
                ]
            );


        return resultado.length > 0;
    };


    // =========================================================
    // CURSOS EM QUE O PROFESSOR PODE ATUAR (com nome)
    // =========================================================

    findCursosByProfessor = async (registro) => {

        const SQL = `
            SELECT
                c.idCurso,
                c.nomeCurso
            FROM professor_curso pc
            INNER JOIN curso c
                ON c.idCurso = pc.idCurso
            WHERE pc.registro = ?
            ORDER BY c.nomeCurso
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [registro]
            );


        return resultado;
    };


    // =========================================================
    // PROFESSORES QUE AINDA NÃO ESTÃO NO CURSO (busca do botão
    // "Adicionar professor existente")
    //
    // Cada professor vem com a lista de cursos em que já está
    // (nome + id), para o coordenador escolher a origem do pedido.
    // Não devolve a senha. termo filtra por nome ou registro.
    // =========================================================

    findDisponiveisParaCurso = async (idCurso, termo = "") => {

        console.log(
            "🟢 ProfessorCursoDAO.findDisponiveisParaCurso():",
            idCurso,
            termo
        );


        const busca =
            `%${String(termo || "").trim()}%`;


        const pool =
            await this.#database.getPool();


        const [professores] =
            await pool.execute(`
                SELECT
                    p.registro,
                    p.nome,
                    p.email1
                FROM professor p
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM professor_curso pc
                    WHERE pc.registro = p.registro
                      AND pc.idCurso = ?
                )
                AND EXISTS (
                    SELECT 1
                    FROM professor_curso pc2
                    WHERE pc2.registro = p.registro
                )
                AND (
                    p.nome LIKE ?
                    OR CAST(p.registro AS CHAR) LIKE ?
                )
                ORDER BY p.nome
            `, [
                Number(idCurso),
                busca,
                busca
            ]);


        if (professores.length === 0) {

            return [];
        }


        const [vinculos] =
            await pool.execute(`
                SELECT
                    pc.registro,
                    c.idCurso,
                    c.nomeCurso
                FROM professor_curso pc
                INNER JOIN curso c
                    ON c.idCurso = pc.idCurso
                ORDER BY c.nomeCurso
            `);


        return professores.map(
            professor => ({

                ...professor,

                cursos:
                    vinculos
                        .filter(
                            v =>
                                Number(v.registro) ===
                                Number(professor.registro)
                        )
                        .map(
                            v => ({
                                idCurso: v.idCurso,
                                nomeCurso: v.nomeCurso
                            })
                        )
            })
        );
    };

};