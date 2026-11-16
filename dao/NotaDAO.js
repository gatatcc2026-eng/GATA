const Nota = require("../model/Nota");
const MysqlDatabase = require("../database/MysqlDatabase");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class NotaDAO {

    #database;

    constructor(databaseInstance) {
        this.#database = databaseInstance;
    }


    // =========================================================
    // CRIAR NOTA
    // =========================================================

    async create(nota) {

        try {

            const sql = `
                INSERT INTO nota (
                    nota,
                    bimestre,
                    AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor
                )
                VALUES (?, ?, ?)
            `;

            const values = [
                nota.nota,
                nota.bimestre,
                nota.alunoDisciplinaProfessor
                    ?.idAlunoDisciplinaProfessor
            ];

            const pool = await this.#database.getPool();

            const [result] = await pool.execute(sql, values);

            return {
                idNota: result.insertId,
                ...nota
            };

        } catch (error) {

            console.error(
                "❌ Erro ao criar nota:",
                error
            );

            if (error instanceof ErrorResponse) {
                throw error;
            }

            throw new ErrorResponse(
                500,
                "Erro ao cadastrar nota."
            );
        }
    }


    // =========================================================
    // BUSCAR POR ID
    // =========================================================

    async findById(idNota) {

        try {

            const sql = `
                SELECT
                    n.idNota,
                    n.nota,
                    n.bimestre,
                    n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor
                FROM nota n
                WHERE n.idNota = ?
            `;

            const pool = await this.#database.getPool();

            const [rows] = await pool.execute(sql, [idNota]);

            if (!rows.length) {
                return null;
            }

            return rows[0];

        } catch (error) {

            console.error(
                "❌ Erro ao buscar nota:",
                error
            );

            throw new ErrorResponse(
                500,
                "Erro ao buscar nota."
            );
        }
    }


    // =========================================================
    // BUSCAR NOTA POR ALUNO/DISCIPLINA/BIMESTRE
    // =========================================================

    async findByAlunoDisciplinaBimestre(
        idAlunoDisciplinaProfessor,
        bimestre
    ) {

        try {

            const sql = `
                SELECT
                    n.idNota,
                    n.nota,
                    n.bimestre,
                    n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor
                FROM nota n
                WHERE
                    n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor = ?
                    AND n.bimestre = ?
            `;

            const pool = await this.#database.getPool();

            const [rows] = await pool.execute(
                sql,
                [
                    idAlunoDisciplinaProfessor,
                    bimestre
                ]
            );

            return rows;

        } catch (error) {

            console.error(
                "❌ Erro ao buscar nota do bimestre:",
                error
            );

            throw new ErrorResponse(
                500,
                "Erro ao buscar nota."
            );
        }
    }


    // =========================================================
    // ATUALIZAR NOTA
    // =========================================================

    async update(idNota, nota) {

        try {

            const sql = `
                UPDATE nota
                SET
                    nota = ?,
                    bimestre = ?,
                    AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor = ?
                WHERE idNota = ?
            `;

            const values = [
                nota.nota,
                nota.bimestre,
                nota.alunoDisciplinaProfessor
                    ?.idAlunoDisciplinaProfessor,
                idNota
            ];

            const pool = await this.#database.getPool();

            const [result] = await pool.execute(sql, values);

            if (result.affectedRows === 0) {

                throw new ErrorResponse(
                    404,
                    "Nota não encontrada."
                );
            }

            return {
                idNota,
                ...nota
            };

        } catch (error) {

            console.error(
                "❌ Erro ao atualizar nota:",
                error
            );

            if (error instanceof ErrorResponse) {
                throw error;
            }

            throw new ErrorResponse(
                500,
                "Erro ao atualizar nota."
            );
        }
    }


    // =========================================================
    // EXCLUIR NOTA
    // =========================================================

    async delete(idNota) {

        try {

            const sql = `
                DELETE FROM nota
                WHERE idNota = ?
            `;

            const pool = await this.#database.getPool();

            const [result] = await pool.execute(sql, [idNota]);

            if (result.affectedRows === 0) {

                throw new ErrorResponse(
                    404,
                    "Nota não encontrada."
                );
            }

            return true;

        } catch (error) {

            console.error(
                "❌ Erro ao excluir nota:",
                error
            );

            if (error instanceof ErrorResponse) {
                throw error;
            }

            throw new ErrorResponse(
                500,
                "Erro ao excluir nota."
            );
        }
    }


    // =========================================================
    // LISTAR TODAS AS NOTAS
    // =========================================================

    async findAll() {

        try {

            const sql = `
                SELECT
                    n.idNota,
                    n.nota,
                    n.bimestre,

                    adp.idAlunoDisciplinaProfessor,

                    a.matricula,
                    a.nome AS nomeAluno,

                    d.idDisciplina,
                    d.nomeDisciplina,

                    t.idTurma,
                    t.nomeTurma,
                    a.ano,

                    c.idCurso,
                    c.nomeCurso,

                    p.registro AS registroProfessor,
                    p.nome AS nomeProfessor

                FROM nota n

                INNER JOIN alunodisciplinaprofessor adp
                    ON adp.idAlunoDisciplinaProfessor =
                       n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor

                INNER JOIN aluno a
                    ON a.matricula = adp.Aluno_matricula

                INNER JOIN disciplina d
                    ON d.idDisciplina = adp.Disciplina_idDisciplina

                INNER JOIN turma t
                    ON t.idTurma = a.Turma_idTurma

                INNER JOIN curso c
                    ON c.idCurso = a.Curso_idCurso

                LEFT JOIN turma_disciplina_professor tdp
                    ON tdp.idTurma = t.idTurma
                    AND tdp.idDisciplina = d.idDisciplina

                LEFT JOIN professor p
                    ON p.registro = tdp.Professor_registro

                ORDER BY
                    t.nomeTurma,
                    d.nomeDisciplina,
                    a.nome,
                    n.bimestre
            `;

            const pool = await this.#database.getPool();

            const [rows] = await pool.execute(sql);

            return rows;

        } catch (error) {

            console.error(
                "❌ ERRO SQL EM NotaDAO.findAll():",
                error
            );

            console.error(
                "Mensagem SQL:",
                error.message
            );

            console.error(
                "Código MySQL:",
                error.code
            );

            console.error(
                "SQL State:",
                error.sqlState
            );

            throw new ErrorResponse(
                500,
                "Erro ao listar notas."
            );
        }
    }


    // =========================================================
    // LISTAR NOTAS POR TURMA
    // =========================================================

    async findByTurma(idTurma) {

        try {

            const sql = `
                SELECT
                    n.idNota,
                    n.nota,
                    n.bimestre,

                    adp.idAlunoDisciplinaProfessor,

                    a.matricula,
                    a.nome AS nomeAluno,

                    d.idDisciplina,
                    d.nomeDisciplina,

                    t.idTurma,
                    t.nomeTurma,
                    a.ano,

                    c.idCurso,
                    c.nomeCurso,

                    p.registro AS registroProfessor,
                    p.nome AS nomeProfessor

                FROM nota n

                INNER JOIN alunodisciplinaprofessor adp
                    ON adp.idAlunoDisciplinaProfessor =
                       n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor

                INNER JOIN aluno a
                    ON a.matricula = adp.Aluno_matricula

                INNER JOIN disciplina d
                    ON d.idDisciplina = adp.Disciplina_idDisciplina

                INNER JOIN turma t
                    ON t.idTurma = a.Turma_idTurma

                INNER JOIN curso c
                    ON c.idCurso = a.Curso_idCurso

                LEFT JOIN turma_disciplina_professor tdp
                    ON tdp.idTurma = t.idTurma
                    AND tdp.idDisciplina = d.idDisciplina

                LEFT JOIN professor p
                    ON p.registro = tdp.Professor_registro

                WHERE t.idTurma = ?

                ORDER BY
                    a.nome,
                    d.nomeDisciplina,
                    n.bimestre
            `;

            const pool = await this.#database.getPool();

            const [rows] = await pool.execute(sql, [idTurma]);

            return rows;

        } catch (error) {

            console.error(
                "❌ ERRO SQL EM NotaDAO.findByTurma():",
                error
            );

            throw new ErrorResponse(
                500,
                "Erro ao buscar notas da turma."
            );
        }
    }


    // =========================================================
    // LISTAR POR TURMA + DISCIPLINA
    // =========================================================

    async findByTurmaDisciplina(
        idTurma,
        idDisciplina
    ) {

        try {

            const sql = `
                SELECT
                    n.idNota,
                    n.nota,
                    n.bimestre,

                    adp.idAlunoDisciplinaProfessor,

                    a.matricula,
                    a.nome AS nomeAluno,

                    d.idDisciplina,
                    d.nomeDisciplina,

                    t.idTurma,
                    t.nomeTurma,
                    a.ano,

                    c.idCurso,
                    c.nomeCurso,

                    p.registro AS registroProfessor,
                    p.nome AS nomeProfessor

                FROM nota n

                INNER JOIN alunodisciplinaprofessor adp
                    ON adp.idAlunoDisciplinaProfessor =
                       n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor

                INNER JOIN aluno a
                    ON a.matricula = adp.Aluno_matricula

                INNER JOIN disciplina d
                    ON d.idDisciplina = adp.Disciplina_idDisciplina

                INNER JOIN turma t
                    ON t.idTurma = a.Turma_idTurma

                INNER JOIN curso c
                    ON c.idCurso = a.Curso_idCurso

                LEFT JOIN turma_disciplina_professor tdp
                    ON tdp.idTurma = t.idTurma
                    AND tdp.idDisciplina = d.idDisciplina

                LEFT JOIN professor p
                    ON p.registro = tdp.Professor_registro

                WHERE
                    t.idTurma = ?
                    AND d.idDisciplina = ?

                ORDER BY
                    a.nome,
                    n.bimestre
            `;

            const pool = await this.#database.getPool();

            const [rows] = await pool.execute(
                sql,
                [
                    idTurma,
                    idDisciplina
                ]
            );

            return rows;

        } catch (error) {

            console.error(
                "❌ ERRO SQL EM NotaDAO.findByTurmaDisciplina():",
                error
            );

            throw new ErrorResponse(
                500,
                "Erro ao buscar notas."
            );
        }
    }


    // =========================================================
    // LISTAR POR PROFESSOR
    // =========================================================

    async findByProfessor(registroProfessor) {

        try {

            const sql = `
                SELECT
                    n.idNota,
                    n.nota,
                    n.bimestre,

                    adp.idAlunoDisciplinaProfessor,

                    a.matricula,
                    a.nome AS nomeAluno,

                    d.idDisciplina,
                    d.nomeDisciplina,

                    t.idTurma,
                    t.nomeTurma,
                    a.ano,

                    c.idCurso,
                    c.nomeCurso,

                    p.registro AS registroProfessor,
                    p.nome AS nomeProfessor

                FROM nota n

                INNER JOIN alunodisciplinaprofessor adp
                    ON adp.idAlunoDisciplinaProfessor =
                       n.AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor

                INNER JOIN aluno a
                    ON a.matricula = adp.Aluno_matricula

                INNER JOIN disciplina d
                    ON d.idDisciplina = adp.Disciplina_idDisciplina

                INNER JOIN turma t
                    ON t.idTurma = a.Turma_idTurma

                INNER JOIN curso c
                    ON c.idCurso = a.Curso_idCurso

                LEFT JOIN turma_disciplina_professor tdp
                    ON tdp.idTurma = t.idTurma
                    AND tdp.idDisciplina = d.idDisciplina

                LEFT JOIN professor p
                    ON p.registro = tdp.Professor_registro

                WHERE p.registro = ?

                ORDER BY
                    t.nomeTurma,
                    d.nomeDisciplina,
                    a.nome,
                    n.bimestre
            `;

            const pool = await this.#database.getPool();

            const [rows] = await pool.execute(sql, [registroProfessor]);

            return rows;

        } catch (error) {

            console.error(
                "❌ ERRO SQL EM NotaDAO.findByProfessor():",
                error
            );

            throw new ErrorResponse(
                500,
                "Erro ao buscar notas do professor."
            );
        }
    }
};