const Turma = require("../model/Turma");
const MysqlDatabase = require("../database/MysqlDatabase");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class TurmaDAO {

    #database;


    constructor(databaseInstance) { 

        console.log(
            "✅ TurmaDAO.constructor()"
        );

        this.#database =
            databaseInstance;

    }


    /* =========================================================
       CRIAR TURMA
       O idTurma é gerado automaticamente pelo AUTO_INCREMENT
    ========================================================= */

    create = async (
        objTurmaModel
    ) => {

        console.log(
            "🟢 TurmaDAO.create()"
        );


        const SQL = `

            INSERT INTO Turma
            (
                nomeTurma,
                Curso_idCurso
            )
            VALUES (?, ?)

        `;


        const params = [

            objTurmaModel.nomeTurma,

            Number(
                objTurmaModel.idCurso
            )

        ];


        console.log(
            "📝 SQL:",
            SQL
        );

        console.log(
            "📝 Params:",
            params
        );


        const pool =
            await this.#database.getPool();


        try {

            const [
                resultado
            ] = await pool.execute(
                SQL,
                params
            );


            if (
                !resultado.insertId
            ) {

                throw new Error(
                    "Falha ao inserir turma."
                );

            }


            console.log(
                "✅ Turma criada com ID:",
                resultado.insertId
            );


            return resultado.insertId;

        }
        catch (error) {

            console.error(
                "❌ Erro SQL ao criar turma:",
                error
            );


            /* =============================================
               FOREIGN KEY DO CURSO
            ============================================= */

            if (
                error.errno === 1452
            ) {

                throw new ErrorResponse(
                    400,
                    "Curso inválido!",
                    {
                        message:
                            "O curso do coordenador não existe no banco de dados."
                    }
                );

            }


            /* =============================================
               DUPLICIDADE
            ============================================= */

            if (
                error.errno === 1062
            ) {

                throw new ErrorResponse(
                    400,
                    "Turma já existe!",
                    {
                        message:
                            "Já existe uma turma com esses dados."
                    }
                );

            }


            throw error;

        }

    };


    /* =========================================================
       DELETE
    ========================================================= */

    delete = async (
        objTurmaModel
    ) => {

        console.log(
            "🟢 TurmaDAO.delete()"
        );


        const SQL =
            "DELETE FROM Turma WHERE idTurma = ?;";


        const params = [
            objTurmaModel.idTurma
        ];


        const pool =
            await this.#database.getPool();


        try {

            const [
                resultado
            ] = await pool.execute(
                SQL,
                params
            );


            return (
                resultado.affectedRows > 0
            );

        }
        catch (error) {

            if (
                error.errno === 1451
            ) {

                throw new ErrorResponse(
                    409,
                    "Não é possível excluir esta turma!",
                    {
                        message:
                            "Esta turma possui alunos matriculados. Transfira os alunos para outra turma antes de excluir."
                    }
                );

            }


            throw error;

        }

    };


    /* =========================================================
       UPDATE
    ========================================================= */

    update = async (
        objTurmaModel
    ) => {

        console.log(
            "🟢 TurmaDAO.update()"
        );


        const SQL = `

            UPDATE Turma

            SET
                nomeTurma = ?,
                Curso_idCurso = ?

            WHERE idTurma = ?

        `;


        const params = [

            objTurmaModel.nomeTurma,

            objTurmaModel.idCurso,

            objTurmaModel.idTurma

        ];


        const pool =
            await this.#database.getPool();


        try {

            const [
                resultado
            ] = await pool.execute(
                SQL,
                params
            );


            return (
                resultado.affectedRows > 0
            );

        }
        catch (error) {

            if (
                error.errno === 1452
            ) {

                throw new ErrorResponse(
                    400,
                    "Curso inválido!",
                    {
                        message:
                            "O curso informado não existe."
                    }
                );

            }


            throw error;

        }

    };


    /* =========================================================
       LISTAR TODAS
    ========================================================= */

    findAll = async () => {

        console.log(
            "🟢 TurmaDAO.findAll()"
        );


        const SQL = `

            SELECT
                t.idTurma,
                t.nomeTurma,
                t.Curso_idCurso,
                c.nomeCurso

            FROM Turma t

            LEFT JOIN Curso c
                ON c.idCurso = t.Curso_idCurso

            ORDER BY
                t.nomeTurma ASC

        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] = await pool.execute(
            SQL
        );


        return resultado;

    };


    /* =========================================================
       BUSCAR POR ID
    ========================================================= */

    findById = async (
        idTurma
    ) => {

        console.log(
            "🟢 TurmaDAO.findById()"
        );


        const resultado =
            await this.findByField(
                "idTurma",
                idTurma
            );


        return (
            resultado[0] ||
            null
        );

    };


    /* =========================================================
       BUSCAR POR CAMPO
    ========================================================= */

    findByField = async (
        field,
        value
    ) => {

        console.log(
            `🟢 TurmaDAO.findByField() - Campo: ${field}, Valor: ${value}`
        );


        const allowedFields = [

            "idTurma",

            "nomeTurma"

        ];


        if (
            !allowedFields.includes(field)
        ) {

            throw new Error(
                `Campo inválido para busca: ${field}`
            );

        }


        const SQL = `

            SELECT *

            FROM Turma

            WHERE ${field} = ?

        `;


        const params = [
            value
        ];


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] = await pool.execute(
            SQL,
            params
        );


        return (
            resultado ||
            []
        );

    };

};
