const Disciplina = require("../model/Disciplina");
const MysqlDatabase = require("../database/MysqlDatabase");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class DisciplinaDAO {
    #database;

    /**
     * @param {MysqlDatabase} databaseInstance
     */
    constructor(databaseInstance) {
        console.log("✅ DisciplinaDAO.constructor()");
        this.#database = databaseInstance;
    }

    /**
     * Cria uma nova Disciplina e vincula todos os pares
     * professor/turma informados na tabela
     * turma_disciplina_professor.
     *
     * @param {Disciplina} objDisciplinaModel
     *   objDisciplinaModel.professores é um array de
     *   { registro, idTurma }.
     * @returns {Promise<number>} id da Disciplina criada.
     */
    create = async (objDisciplinaModel) => {

        console.log("🟢 DisciplinaDAO.create()");

        const pool = await this.#database.getPool();

        const SQL_DISCIPLINA = `
            INSERT INTO disciplina
            (
                idDisciplina,
                nomeDisciplina,
                Curso_idCurso
            )
            VALUES (?, ?, ?)
        `;

        const paramsDisciplina = [
            objDisciplinaModel.idDisciplina,
            objDisciplinaModel.nomeDisciplina,
            objDisciplinaModel.Curso_idCurso
        ];

        await pool.execute(
            SQL_DISCIPLINA,
            paramsDisciplina
        );


        /* =====================================================
           VINCULAR PROFESSORES ÀS TURMAS
        ===================================================== */

        const SQL_VINCULO = `
            INSERT INTO turma_disciplina_professor
            (
                idTurma,
                idDisciplina,
                Professor_registro
            )
            VALUES (?, ?, ?)
        `;

        for (
            const { registro, idTurma }
            of objDisciplinaModel.professores
        ) {

            await pool.execute(
                SQL_VINCULO,
                [
                    idTurma,
                    objDisciplinaModel.idDisciplina,
                    registro
                ]
            );

        }


        return objDisciplinaModel.idDisciplina;
    };


    /**
     * Remove uma disciplina do banco de dados.
     * Os vínculos em turma_disciplina_professor são removidos
     * automaticamente (ON DELETE CASCADE).
     *
     * @param {Disciplina} objDisciplinaModel
     * @returns {Promise<boolean>}
     */
    delete = async (objDisciplinaModel) => {
        console.log("🟢 DisciplinaDAO.delete()");

        const SQL = "DELETE FROM disciplina WHERE idDisciplina = ?;";
        const params = [objDisciplinaModel.idDisciplina];

        const pool = await this.#database.getPool();

        try {
            const [resultado] = await pool.execute(SQL, params);
            return resultado.affectedRows > 0;

        } catch (error) {
            if (error.errno === 1451) {
                throw new ErrorResponse(
                    409,
                    "Não é possível excluir esta disciplina!",
                    { message: "Esta disciplina possui alunos matriculados nela. Remova os vínculos de aluno-disciplina antes de excluir." }
                );
            }
            throw error;
        }
    };


    /**
     * Atualiza os dados de uma Disciplina, substituindo por
     * completo a lista de vínculos turma/professor.
     *
     * @param {Disciplina} objDisciplinaModel
     *   objDisciplinaModel.professores é um array de
     *   { registro, idTurma }.
     * @returns {Promise<boolean>}
     */
    update = async (objDisciplinaModel) => {

        console.log("🟢 DisciplinaDAO.update()");

        const pool = await this.#database.getPool();

        // =====================================================
        // ATUALIZAÇÃO NORMAL DA DISCIPLINA
        // =====================================================

        const SQL_DISCIPLINA = `
            UPDATE disciplina
            SET
                nomeDisciplina = ?,
                Curso_idCurso = ?
            WHERE idDisciplina = ?
        `;

        const paramsDisciplina = [
            objDisciplinaModel.nomeDisciplina,
            objDisciplinaModel.Curso_idCurso,
            objDisciplinaModel.idDisciplina
        ];

        const [resultado] =
            await pool.execute(
                SQL_DISCIPLINA,
                paramsDisciplina
            );


        // =====================================================
        // SUBSTITUIR VÍNCULOS
        // =====================================================

        await pool.execute(
            `
            DELETE FROM turma_disciplina_professor
            WHERE idDisciplina = ?
            `,
            [
                objDisciplinaModel.idDisciplina
            ]
        );


        const SQL_VINCULO = `
            INSERT INTO turma_disciplina_professor
            (
                idTurma,
                idDisciplina,
                Professor_registro
            )
            VALUES (?, ?, ?)
        `;


        for (
            const { registro, idTurma }
            of objDisciplinaModel.professores
        ) {

            await pool.execute(
                SQL_VINCULO,
                [
                    idTurma,
                    objDisciplinaModel.idDisciplina,
                    registro
                ]
            );
        }


        return resultado.affectedRows > 0;
    };


    /**
     * Retorna todas as disciplinas cadastradas, cada uma já
     * com a lista de vínculos turma/professor (campo
     * "professores", array de { registro, idTurma }).
     *
     * @returns {Promise<Array>}
     */
    findAll = async () => {
        console.log("🟢 DisciplinaDAO.findAll()");

        const SQL = `
            SELECT
                d.*,
                c.nomeCurso
            FROM disciplina d
            INNER JOIN curso c
                ON d.Curso_idCurso = c.idCurso
            ORDER BY d.idDisciplina;
        `;

        const pool = await this.#database.getPool();
        const [disciplinas] = await pool.execute(SQL);


        const SQL_VINCULOS = `
            SELECT idTurma, idDisciplina, Professor_registro
            FROM turma_disciplina_professor;
        `;

        const [vinculos] = await pool.execute(SQL_VINCULOS);


        /* =====================================================
           AGRUPAR OS VÍNCULOS POR DISCIPLINA
        ===================================================== */

        return disciplinas.map(
            disciplina => ({

                ...disciplina,

                professores:
                    vinculos
                        .filter(
                            v =>
                                Number(v.idDisciplina) ===
                                Number(disciplina.idDisciplina)
                        )
                        .map(
                            v => ({
                                registro: v.Professor_registro,
                                idTurma: v.idTurma
                            })
                        )

            })
        );
    };


    /**
     * Busca uma Disciplina pelo id, já com a lista de
     * vínculos turma/professor (campo "professores", array
     * de { registro, idTurma }).
     *
     * @param {number} idDisciplina
     * @returns {Promise<Object|null>}
     */
    findById = async (idDisciplina) => {
        console.log("🟢 DisciplinaDAO.findById()");

        const pool = await this.#database.getPool();

        const [disciplinas] =
            await pool.execute(
                "SELECT * FROM disciplina WHERE idDisciplina = ?;",
                [idDisciplina]
            );


        if (
            disciplinas.length === 0
        ) {

            return null;

        }


        const [vinculos] =
            await pool.execute(
                "SELECT idTurma, Professor_registro FROM turma_disciplina_professor WHERE idDisciplina = ?;",
                [idDisciplina]
            );


        return {

            ...disciplinas[0],

            professores:
                vinculos.map(
                    v => ({
                        registro: v.Professor_registro,
                        idTurma: v.idTurma
                    })
                )

        };
    };


    /**
     * Busca disciplinas por um campo específico da tabela
     * disciplina (não inclui mais "Professor_registro" —
     * use findByProfessor para isso).
     *
     * @param {string} field
     * @param {*} value
     * @returns {Promise<Array>}
     */
    findByField = async (field, value) => {

        console.log(
            `🟢 DisciplinaDAO.findByField() - Campo: ${field}, Valor: ${value}`
        );


        const allowedFields = [
            "idDisciplina",
            "nomeDisciplina",
            "Curso_idCurso"
        ];


        if (
            !allowedFields.includes(field)
        ) {

            throw new Error(
                `Campo inválido para busca: ${field}`
            );
        }


        const SQL =
            `SELECT * FROM disciplina WHERE ${field} = ?;`;


        const params = [
            value
        ];


        const pool =
            await this.#database.getPool();


        const [resultado] =
            await pool.execute(
                SQL,
                params
            );


        return resultado || [];
    };


    /**
     * Retorna todas as disciplinas em que o professor
     * informado está vinculado (via turma_disciplina_professor),
     * independente da turma.
     *
     * @param {number} registroProfessor
     * @returns {Promise<Array>}
     */
    findByProfessor = async (registroProfessor) => {

        console.log(
            "🟢 DisciplinaDAO.findByProfessor()"
        );

        const SQL = `
            SELECT DISTINCT d.*
            FROM disciplina d
            INNER JOIN turma_disciplina_professor tdp
                ON tdp.idDisciplina = d.idDisciplina
            WHERE tdp.Professor_registro = ?;
        `;

        const pool = await this.#database.getPool();

        const [resultado] =
            await pool.execute(
                SQL,
                [registroProfessor]
            );

        return resultado || [];
    };


    /**
     * Retorna as disciplinas (com a turma específica) em que
     * o professor informado leciona.
     *
     * @param {number} registroProfessor
     * @returns {Promise<Array>} cada item traz idTurma,
     *   idDisciplina e os dados da disciplina.
     */
    findByProfessorComTurma = async (registroProfessor) => {

        console.log(
            "🟢 DisciplinaDAO.findByProfessorComTurma()"
        );

        const SQL = `
            SELECT
                tdp.idTurma,
                d.*
            FROM disciplina d
            INNER JOIN turma_disciplina_professor tdp
                ON tdp.idDisciplina = d.idDisciplina
            WHERE tdp.Professor_registro = ?;
        `;

        const pool = await this.#database.getPool();

        const [resultado] =
            await pool.execute(
                SQL,
                [registroProfessor]
            );

        return resultado || [];
    };


    findByCurso = async (idCurso) => {

        console.log(
            "🟢 ProfessorDAO.findByCurso()"
        );

        const SQL = `
            SELECT DISTINCT p.*
            FROM professor p
            INNER JOIN turma_disciplina_professor tdp
                ON tdp.Professor_registro = p.registro
            INNER JOIN disciplina d
                ON d.idDisciplina = tdp.idDisciplina
            WHERE d.Curso_idCurso = ?
        `;

        const pool =
            await this.#database.getPool();

        const [resultado] =
            await pool.execute(
                SQL,
                [idCurso]
            );

        return resultado || [];
    };

}