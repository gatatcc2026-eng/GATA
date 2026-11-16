const Aluno = require("../model/Aluno");
const MysqlDatabase = require("../database/MysqlDatabase");
const ErrorResponse = require("../utils/ErrorResponse");

// Coluna da tabela "nota" que aponta para alunodisciplinaprofessor
// (confere com o gata.sql novo).
const COLUNA_NOTA_ADP = "AlunoDisciplinaProfessor_idAlunoDisciplinaProfessor";

module.exports = class AlunoDAO {

    #database;


    // =========================================================
    // CONSTRUTOR
    // =========================================================

    constructor(databaseInstance) {

        console.log("✅ AlunoDAO.constructor()");

        this.#database = databaseInstance;
    }


    // =========================================================
    // CRIAR ALUNO
    // =========================================================

    create = async (objAlunoModel) => {

        console.log("🟢 AlunoDAO.create()");

        const SQL = `
            INSERT INTO aluno
            (matricula, nome, email, senha, telefone, Curso_idCurso, Turma_idTurma, ano)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            objAlunoModel.matricula,
            objAlunoModel.nome,
            objAlunoModel.email,
            objAlunoModel.senha,
            objAlunoModel.telefone,
            objAlunoModel.curso.idCurso,
            objAlunoModel.turma.idTurma,
            objAlunoModel.ano
        ];

        const pool = await this.#database.getPool();

        const [resultado] = await pool.execute(SQL, params);

        return resultado.insertId || objAlunoModel.matricula;
    };


    // =========================================================
    // DELETAR ALUNO
    //
    // forcar = false (padrão): só exclui se o aluno NÃO tiver nota.
    //   Com notas -> 409 com details.possuiNotas = true.
    // forcar = true: apaga também as notas (o histórico das notas
    //   cai junto por CASCADE), contestações, solicitações e vínculos
    //   com disciplinas, e depois o aluno. Tudo numa transação.
    // =========================================================

    delete = async (objAlunoModel, forcar = false) => {

        console.log("🟢 AlunoDAO.delete() - forcar:", forcar);

        const matricula = objAlunoModel.matricula;

        const pool = await this.#database.getPool();

        const conexao = await pool.getConnection();

        try {

            await conexao.beginTransaction();

            // -------------------------------------------------
            // TEM NOTA EM ALGUMA DISCIPLINA?
            // -------------------------------------------------

            const [notas] = await conexao.execute(
                `SELECT COUNT(*) AS total
                 FROM nota n
                 INNER JOIN alunodisciplinaprofessor adp
                    ON n.${COLUNA_NOTA_ADP} = adp.idAlunoDisciplinaProfessor
                 WHERE adp.Aluno_matricula = ?`,
                [matricula]
            );

            const totalNotas = Number(notas[0]?.total || 0);

            if (totalNotas > 0 && !forcar) {

                throw new ErrorResponse(
                    409,
                    "Não é possível excluir este aluno!",
                    {
                        message:
                            "Este aluno já possui notas lançadas em uma ou mais disciplinas.",
                        possuiNotas: true,
                        totalNotas: totalNotas
                    }
                );
            }

            // -------------------------------------------------
            // NOTAS (só na exclusão forçada)
            // -------------------------------------------------

            if (totalNotas > 0 && forcar) {

                // histórico das notas primeiro (não depende do CASCADE do banco)
                await conexao.execute(
                    `DELETE FROM historico
                     WHERE nota_idNota IN (
                        SELECT n.idNota
                        FROM nota n
                        INNER JOIN alunodisciplinaprofessor adp
                            ON n.${COLUNA_NOTA_ADP} = adp.idAlunoDisciplinaProfessor
                        WHERE adp.Aluno_matricula = ?
                     )`,
                    [matricula]
                );

                await conexao.execute(
                    `DELETE FROM nota
                     WHERE ${COLUNA_NOTA_ADP} IN (
                        SELECT idAlunoDisciplinaProfessor
                        FROM alunodisciplinaprofessor
                        WHERE Aluno_matricula = ?
                     )`,
                    [matricula]
                );
            }

            // -------------------------------------------------
            // VÍNCULOS E REGISTROS LIGADOS AO ALUNO
            // -------------------------------------------------

            await conexao.execute(
                `DELETE FROM contestacao WHERE matricula = ?`,
                [matricula]
            );

            await conexao.execute(
                `DELETE FROM solicitacaotransferencia WHERE matricula = ?`,
                [matricula]
            );

            await conexao.execute(
                `DELETE FROM alunodisciplinaprofessor WHERE Aluno_matricula = ?`,
                [matricula]
            );

            const [resultado] = await conexao.execute(
                `DELETE FROM aluno WHERE matricula = ?`,
                [matricula]
            );

            await conexao.commit();

            return resultado.affectedRows > 0;

        } catch (error) {

            try {
                await conexao.rollback();
            } catch (rollbackError) {
                console.error("❌ Erro no rollback:", rollbackError);
            }

            console.error("❌ Erro no AlunoDAO.delete():", error.message);
            console.error("   Código:", error.code, "| SQL:", error.sqlMessage);

            if (error instanceof ErrorResponse) {
                throw error;
            }

            if (
                error.errno === 1451 ||
                error.code === "ER_ROW_IS_REFERENCED_2" ||
                error.code === "ER_ROW_IS_REFERENCED"
            ) {

                throw new ErrorResponse(
                    409,
                    "Não é possível excluir este aluno!",
                    {
                        message:
                            "Este aluno ainda possui registros vinculados que impedem a exclusão."
                    }
                );
            }

            throw error;

        } finally {

            conexao.release();
        }
    };


    // =========================================================
    // ATUALIZAR ALUNO
    // =========================================================

    update = async (objAlunoModel) => {

        console.log("🟢 AlunoDAO.update()");

        const SQL = `
            UPDATE aluno
            SET nome = ?, email = ?, senha = ?, telefone = ?,
                Curso_idCurso = ?, Turma_idTurma = ?, ano = ?
            WHERE matricula = ?
        `;

        const params = [
            objAlunoModel.nome,
            objAlunoModel.email,
            objAlunoModel.senha,
            objAlunoModel.telefone,
            objAlunoModel.curso.idCurso,
            objAlunoModel.turma.idTurma,
            objAlunoModel.ano,
            objAlunoModel.matricula
        ];

        const pool = await this.#database.getPool();

        const [resultado] = await pool.execute(SQL, params);

        return resultado.affectedRows > 0;
    };


    // =========================================================
    // LISTAR TODOS
    // =========================================================

    findAll = async () => {

        console.log("🟢 AlunoDAO.findAll()");

        const SQL = `SELECT * FROM aluno ORDER BY nome`;

        const pool = await this.#database.getPool();

        const [resultado] = await pool.execute(SQL);

        return resultado;
    };


    // =========================================================
    // BUSCAR POR MATRÍCULA
    // =========================================================

    findById = async (matricula) => {

        console.log("🟢 AlunoDAO.findById():", matricula);

        const resultado = await this.findByField("matricula", matricula);

        return resultado[0] || null;
    };


    // =========================================================
    // BUSCAR POR CAMPO
    // =========================================================

    findByField = async (field, value) => {

        console.log(`🟢 AlunoDAO.findByField() - Campo: ${field}, Valor: ${value}`);

        const allowedFields = [
            "matricula", "nome", "email", "senha",
            "telefone", "Curso_idCurso", "Turma_idTurma", "ano"
        ];

        if (!allowedFields.includes(field)) {
            throw new Error(`Campo inválido para busca: ${field}`);
        }

        const SQL = `SELECT * FROM aluno WHERE ${field} = ?`;

        const pool = await this.#database.getPool();

        const [resultado] = await pool.execute(SQL, [value]);

        return resultado || [];
    };


    // =========================================================
    // IDS DAS DISCIPLINAS EM QUE O ALUNO ESTÁ VINCULADO
    // =========================================================

    findIdsDisciplinasDoAluno = async (matricula) => {

        console.log("🟢 AlunoDAO.findIdsDisciplinasDoAluno():", matricula);

        const SQL = `
            SELECT DISTINCT Disciplina_idDisciplina AS idDisciplina
            FROM alunodisciplinaprofessor
            WHERE Aluno_matricula = ?
        `;

        const pool = await this.#database.getPool();

        const [resultado] = await pool.execute(SQL, [matricula]);

        return resultado.map(r => Number(r.idDisciplina));
    };


    // =========================================================
    // IDS DAS DISCIPLINAS EM QUE O ALUNO JÁ TEM NOTA
    // (essas não podem ser removidas)
    // =========================================================

    findIdsDisciplinasComNota = async (matricula) => {

        console.log("🟢 AlunoDAO.findIdsDisciplinasComNota():", matricula);

        const SQL = `
            SELECT DISTINCT adp.Disciplina_idDisciplina AS idDisciplina
            FROM alunodisciplinaprofessor adp
            INNER JOIN nota n
                ON n.${COLUNA_NOTA_ADP} = adp.idAlunoDisciplinaProfessor
            WHERE adp.Aluno_matricula = ?
        `;

        const pool = await this.#database.getPool();

        const [resultado] = await pool.execute(SQL, [matricula]);

        return resultado.map(r => Number(r.idDisciplina));
    };


    // =========================================================
    // PROFESSOR DE CADA DISCIPLINA DA TURMA DO ALUNO
    // (só id da disciplina, registro e nome: o aluno pode ver)
    // =========================================================

    findProfessoresDasDisciplinas = async (matricula) => {

        console.log("🟢 AlunoDAO.findProfessoresDasDisciplinas():", matricula);

        const SQL = `
            SELECT DISTINCT
                tdp.idDisciplina AS idDisciplina,
                p.registro AS registro,
                p.nome AS nome
            FROM aluno a
            INNER JOIN turma_disciplina_professor tdp
                ON tdp.idTurma = a.Turma_idTurma
            INNER JOIN professor p
                ON p.registro = tdp.Professor_registro
            WHERE a.matricula = ?
        `;

        const pool = await this.#database.getPool();

        const [resultado] = await pool.execute(SQL, [matricula]);

        return resultado;
    };


    // =========================================================
    // ATUALIZAR AS DISCIPLINAS DO ALUNO
    //
    // idsDesejados: ids que devem ficar vinculados (só do curso
    // do aluno). Tudo numa transação:
    //   - disciplina de outro curso -> 400
    //   - remover disciplina com nota -> 409 (nada é alterado)
    //   - vínculos de disciplinas de outros cursos (ex.: curso
    //     antigo após transferência) não são mexidos.
    // =========================================================

    atualizarDisciplinas = async (matricula, idCurso, idsDesejados) => {

        console.log("🟢 AlunoDAO.atualizarDisciplinas():", matricula);

        const pool = await this.#database.getPool();

        const conexao = await pool.getConnection();

        try {

            await conexao.beginTransaction();

            // -------------------------------------------------
            // DISCIPLINAS DO CURSO DO ALUNO
            // -------------------------------------------------

            const [doCurso] = await conexao.execute(
                `SELECT idDisciplina FROM disciplina WHERE Curso_idCurso = ?`,
                [Number(idCurso)]
            );

            const idsDoCurso = doCurso.map(r => Number(r.idDisciplina));

            const foraDoCurso = idsDesejados.filter(
                id => !idsDoCurso.includes(id)
            );

            if (foraDoCurso.length > 0) {

                throw new ErrorResponse(
                    400,
                    "Disciplina inválida!",
                    {
                        message:
                            "Só é possível vincular disciplinas do curso do aluno."
                    }
                );
            }

            // -------------------------------------------------
            // VÍNCULOS ATUAIS E DISCIPLINAS COM NOTA
            // -------------------------------------------------

            const [vinculos] = await conexao.execute(
                `SELECT DISTINCT Disciplina_idDisciplina AS idDisciplina
                 FROM alunodisciplinaprofessor
                 WHERE Aluno_matricula = ?`,
                [matricula]
            );

            const atuais = vinculos.map(r => Number(r.idDisciplina));

            const [comNotaRows] = await conexao.execute(
                `SELECT DISTINCT adp.Disciplina_idDisciplina AS idDisciplina
                 FROM alunodisciplinaprofessor adp
                 INNER JOIN nota n
                    ON n.${COLUNA_NOTA_ADP} = adp.idAlunoDisciplinaProfessor
                 WHERE adp.Aluno_matricula = ?`,
                [matricula]
            );

            const comNota = comNotaRows.map(r => Number(r.idDisciplina));

            // -------------------------------------------------
            // O QUE REMOVER / ADICIONAR
            // -------------------------------------------------

            const remover = atuais.filter(
                id =>
                    idsDoCurso.includes(id) &&
                    !idsDesejados.includes(id)
            );

            const bloqueadas = remover.filter(id => comNota.includes(id));

            if (bloqueadas.length > 0) {

                throw new ErrorResponse(
                    409,
                    "Não é possível remover disciplina com notas!",
                    {
                        message:
                            "O aluno já possui notas em uma ou mais disciplinas que você tentou remover."
                    }
                );
            }

            const adicionar = idsDesejados.filter(
                id => !atuais.includes(id)
            );

            // -------------------------------------------------
            // APLICAR
            // -------------------------------------------------

            for (const idDisciplina of remover) {

                await conexao.execute(
                    `DELETE FROM alunodisciplinaprofessor
                     WHERE Aluno_matricula = ? AND Disciplina_idDisciplina = ?`,
                    [matricula, idDisciplina]
                );
            }

            for (const idDisciplina of adicionar) {

                await conexao.execute(
                    `INSERT INTO alunodisciplinaprofessor
                     (Aluno_matricula, Disciplina_idDisciplina)
                     VALUES (?, ?)`,
                    [matricula, idDisciplina]
                );
            }

            await conexao.commit();

            return {
                adicionadas: adicionar.length,
                removidas: remover.length
            };

        } catch (error) {

            try {
                await conexao.rollback();
            } catch (rollbackError) {
                console.error("❌ Erro no rollback:", rollbackError);
            }

            console.error("❌ Erro em AlunoDAO.atualizarDisciplinas():", error.message);

            throw error;

        } finally {

            conexao.release();
        }
    };


    // =========================================================
    // LIMPAR ALUNOS DE UM CURSO (usado pelo coordenador)
    //
    // Ordem (por causa das chaves estrangeiras):
    //   contestacao -> solicitacaotransferencia -> nota
    //   -> alunodisciplinaprofessor -> aluno
    //
    // Só mexe nos alunos do curso informado.
    // Tudo dentro de uma transação: se algo falhar, nada é apagado.
    // =========================================================

    limparAlunosDoCurso = async (idCurso) => {

        console.log("🟢 AlunoDAO.limparAlunosDoCurso():", idCurso);

        const pool = await this.#database.getPool();

        const conexao = await pool.getConnection();

        try {

            await conexao.beginTransaction();

            const cursoId = Number(idCurso);

            const alunosDoCurso =
                `SELECT matricula FROM aluno WHERE Curso_idCurso = ?`;

            // -------------------------------------------------
            // CONTAR
            // -------------------------------------------------

            const [contagem] = await conexao.execute(
                `SELECT COUNT(*) AS total FROM aluno WHERE Curso_idCurso = ?`,
                [cursoId]
            );

            const quantidade = Number(contagem[0]?.total || 0);

            console.log("👨‍🎓 Alunos do curso:", quantidade);

            if (quantidade === 0) {
                await conexao.commit();
                return 0;
            }

            // -------------------------------------------------
            // CONTESTAÇÕES
            // -------------------------------------------------

            const [rContestacoes] = await conexao.execute(
                `DELETE FROM contestacao WHERE matricula IN (${alunosDoCurso})`,
                [cursoId]
            );

            console.log("✅ Contestações removidas:", rContestacoes.affectedRows);

            // -------------------------------------------------
            // SOLICITAÇÕES DE TRANSFERÊNCIA
            // -------------------------------------------------

            const [rSolicitacoes] = await conexao.execute(
                `DELETE FROM solicitacaotransferencia WHERE matricula IN (${alunosDoCurso})`,
                [cursoId]
            );

            console.log("✅ Solicitações removidas:", rSolicitacoes.affectedRows);

            // -------------------------------------------------
            // NOTAS
            // -------------------------------------------------

            const [rNotas] = await conexao.execute(
                `DELETE FROM nota
                 WHERE ${COLUNA_NOTA_ADP} IN (
                    SELECT idAlunoDisciplinaProfessor
                    FROM alunodisciplinaprofessor
                    WHERE Aluno_matricula IN (${alunosDoCurso})
                 )`,
                [cursoId]
            );

            console.log("✅ Notas removidas:", rNotas.affectedRows);

            // -------------------------------------------------
            // VÍNCULOS ALUNO / DISCIPLINA
            // -------------------------------------------------

            const [rAdp] = await conexao.execute(
                `DELETE FROM alunodisciplinaprofessor
                 WHERE Aluno_matricula IN (${alunosDoCurso})`,
                [cursoId]
            );

            console.log("✅ Vínculos removidos:", rAdp.affectedRows);

            // -------------------------------------------------
            // ALUNOS
            // -------------------------------------------------

            const [rAlunos] = await conexao.execute(
                `DELETE FROM aluno WHERE Curso_idCurso = ?`,
                [cursoId]
            );

            console.log("✅ Alunos removidos:", rAlunos.affectedRows);

            await conexao.commit();

            return quantidade;

        } catch (error) {

            try {
                await conexao.rollback();
            } catch (rollbackError) {
                console.error("❌ Erro no rollback:", rollbackError);
            }

            console.error("❌ ERRO REAL EM AlunoDAO.limparAlunosDoCurso()");
            console.error("Mensagem:", error.message);
            console.error("Código:", error.code);
            console.error("SQL Message:", error.sqlMessage);

            throw error;

        } finally {

            conexao.release();
        }
    };


    // =========================================================
    // LIMPAR TODOS OS ALUNOS (todos os cursos)
    // Não é usado pelo coordenador.
    // =========================================================

    limparTodosAlunos = async () => {

        console.log("🟢 AlunoDAO.limparTodosAlunos()");

        const pool = await this.#database.getPool();

        const conexao = await pool.getConnection();

        try {

            await conexao.beginTransaction();

            const [resultadoQuantidade] = await conexao.execute(
                `SELECT COUNT(*) AS total FROM aluno`
            );

            const quantidade = Number(resultadoQuantidade[0]?.total || 0);

            await conexao.execute(`DELETE FROM contestacao`);
            await conexao.execute(`DELETE FROM solicitacaotransferencia`);
            await conexao.execute(`DELETE FROM nota`);
            await conexao.execute(`DELETE FROM alunodisciplinaprofessor`);
            await conexao.execute(`DELETE FROM aluno`);

            await conexao.commit();

            return quantidade;

        } catch (error) {

            try {
                await conexao.rollback();
            } catch (rollbackError) {
                console.error("❌ Erro no rollback:", rollbackError);
            }

            console.error("❌ ERRO REAL EM AlunoDAO.limparTodosAlunos()", error.sqlMessage);

            throw error;

        } finally {

            conexao.release();
        }
    };

};