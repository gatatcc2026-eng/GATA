const MysqlDatabase = require("../database/MysqlDatabase");
const ErrorResponse = require("../utils/ErrorResponse");

module.exports = class ProfessorDAO {

    #database;


    // =========================================================
    // CONSTRUTOR
    // =========================================================

    constructor(databaseInstance) {

        console.log(
            "✅ ProfessorDAO.constructor()"
        );

        this.#database =
            databaseInstance;
    }


    // =========================================================
    // CRIAR PROFESSOR
    //
    // Se for coordenador, o trigger trg_prof_after_insert_vinculo
    // já vincula o professor ao curso que ele coordena. Para um
    // professor comum, o Service chama ProfessorCursoDAO.vincular().
    // =========================================================

    createProfessor = async (objProfessorModel) => {

        console.log(
            "🟢 ProfessorDAO.createProfessor()"
        );


        const SQL = `
            INSERT INTO professor
            (
                registro,
                nome,
                senha,
                telefone1,
                email1,
                coordenador,
                CursoCoordenado_idCurso
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;


        const params = [

            objProfessorModel.registro,

            objProfessorModel.nome,

            objProfessorModel.senha,

            objProfessorModel.telefone1,

            objProfessorModel.email1,

            objProfessorModel.coordenador,

            objProfessorModel.CursoCoordenado_idCurso ||
            null

        ];


        const pool =
            await this.#database.getPool();


        await pool.execute(
            SQL,
            params
        );


        return objProfessorModel.registro;
    };


    // =========================================================
    // DELETAR PROFESSOR
    // =========================================================

    deleteProfessor = async (registro) => {

        console.log(
            "🟢 ProfessorDAO.deleteProfessor():",
            registro
        );


        const SQL = `
            DELETE FROM professor
            WHERE registro = ?
        `;


        const pool =
            await this.#database.getPool();


        try {

            const [
                resultado
            ] =
                await pool.execute(
                    SQL,
                    [registro]
                );


            return (
                resultado.affectedRows > 0
            );


        } catch (error) {

            console.error(
                "❌ Erro no ProfessorDAO.deleteProfessor():",
                error
            );


            if (
                error.errno === 1451 ||
                error.code ===
                "ER_ROW_IS_REFERENCED_2" ||
                error.code ===
                "ER_ROW_IS_REFERENCED"
            ) {

                throw new ErrorResponse(
                    409,
                    "Não é possível excluir este professor!",
                    {
                        message:
                            "Este professor possui disciplinas ou outros registros vinculados. Transfira os vínculos antes de excluir."
                    }
                );
            }


            throw error;
        }
    };


    // =========================================================
    // ATUALIZAR PROFESSOR
    // =========================================================

    updateProfessor = async (objProfessorModel) => {

        console.log(
            "🟢 ProfessorDAO.updateProfessor()"
        );


        const SQL = `
            UPDATE professor
            SET
                nome = ?,
                senha = ?,
                telefone1 = ?,
                email1 = ?,
                coordenador = ?,
                CursoCoordenado_idCurso = ?
            WHERE registro = ?
        `;


        const params = [

            objProfessorModel.nome,

            objProfessorModel.senha,

            objProfessorModel.telefone1,

            objProfessorModel.email1,

            objProfessorModel.coordenador,

            objProfessorModel.CursoCoordenado_idCurso ||
            null,

            objProfessorModel.registro

        ];


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                params
            );


        return (
            resultado.affectedRows > 0
        );
    };


    // =========================================================
    // LISTAR TODOS
    // =========================================================

    findAll = async () => {

        console.log(
            "🟢 ProfessorDAO.findAll()"
        );


        const SQL = `
            SELECT
                registro,
                nome,
                senha,
                telefone1,
                email1,
                coordenador,
                CursoCoordenado_idCurso
            FROM professor
            ORDER BY nome
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL
            );


        return resultado;
    };


    // =========================================================
    // BUSCAR POR REGISTRO
    // =========================================================

    findByRegistro = async (registro) => {

        console.log(
            "🟢 ProfessorDAO.findByRegistro():",
            registro
        );


        const SQL = `
            SELECT
                registro,
                nome,
                senha,
                telefone1,
                email1,
                coordenador,
                CursoCoordenado_idCurso
            FROM professor
            WHERE registro = ?
            LIMIT 1
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


        if (
            !resultado ||
            resultado.length === 0
        ) {

            return null;
        }


        return resultado[0];
    };


    // =========================================================
    // BUSCAR POR ID
    //
    // Mantido para compatibilidade.
    // =========================================================

    findById = async (registro) => {

        console.log(
            "🟢 ProfessorDAO.findById():",
            registro
        );


        return await this.findByRegistro(
            registro
        );
    };


    // =========================================================
    // BUSCAR POR CAMPO
    // =========================================================

    findByField = async (
        field,
        value
    ) => {

        console.log(
            `🟢 ProfessorDAO.findByField() - Campo: ${field}, Valor: ${value}`
        );


        const allowedFields = [

            "registro",

            "nome",

            "senha",

            "telefone1",

            "email1",

            "coordenador",

            "CursoCoordenado_idCurso"

        ];


        if (
            !allowedFields.includes(field)
        ) {

            throw new Error(
                `Campo inválido para busca: ${field}`
            );
        }


        const SQL = `
            SELECT
                registro,
                nome,
                senha,
                telefone1,
                email1,
                coordenador,
                CursoCoordenado_idCurso
            FROM professor
            WHERE ${field} = ?
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [value]
            );


        return resultado || [];
    };


    // =========================================================
    // PROFESSORES POR CURSO
    //
    // Agora usa professor_curso: o professor aparece no curso
    // assim que é vinculado (inclusive depois de uma solicitação
    // aceita), mesmo sem disciplina atribuída ainda.
    // =========================================================

    findByCurso = async (idCurso) => {

        console.log(
            "🔎 ProfessorDAO.findByCurso():",
            idCurso
        );


        const SQL = `
            SELECT
                p.registro,
                p.nome,
                p.senha,
                p.telefone1,
                p.email1,
                p.coordenador,
                p.CursoCoordenado_idCurso
            FROM professor p

            INNER JOIN professor_curso pc
                ON pc.registro = p.registro

            WHERE pc.idCurso = ?

            ORDER BY p.nome
        `;


        const pool =
            await this.#database.getPool();


        const [
            resultado
        ] =
            await pool.execute(
                SQL,
                [Number(idCurso)]
            );


        console.log(
            "👨‍🏫 Professores encontrados no curso:",
            resultado
        );


        return resultado;
    };


    // =========================================================
    // LISTAR TODOS COM CURSOS
    //
    // - nomeCursoCoordenado: curso que o professor COORDENA
    // - cursosVinculados: cursos em que ele PODE atuar
    //   (professor_curso)
    // - cursosLeciona: cursos em que ele LECIONA de fato (pelas
    //   disciplinas em turma_disciplina_professor)
    //
    // Sempre nome + id do curso; o front mostra só o nome.
    // Não devolve a senha.
    // =========================================================

    findAllComCursos = async () => {

        console.log(
            "🟢 ProfessorDAO.findAllComCursos()"
        );


        const pool =
            await this.#database.getPool();


        const [professores] =
            await pool.execute(`
                SELECT
                    p.registro,
                    p.nome,
                    p.telefone1,
                    p.email1,
                    p.coordenador,
                    p.CursoCoordenado_idCurso,
                    cc.nomeCurso AS nomeCursoCoordenado
                FROM professor p
                LEFT JOIN curso cc
                    ON cc.idCurso = p.CursoCoordenado_idCurso
                ORDER BY p.nome
            `);


        const [vinculados] =
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


        const [vinculos] =
            await pool.execute(`
                SELECT DISTINCT
                    tdp.Professor_registro,
                    c.idCurso,
                    c.nomeCurso
                FROM turma_disciplina_professor tdp
                INNER JOIN disciplina d
                    ON d.idDisciplina = tdp.idDisciplina
                INNER JOIN curso c
                    ON c.idCurso = d.Curso_idCurso
                ORDER BY c.nomeCurso
            `);


        return professores.map(
            professor => ({

                ...professor,

                cursosVinculados:
                    vinculados
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
                        ),

                cursosLeciona:
                    vinculos
                        .filter(
                            v =>
                                Number(v.Professor_registro) ===
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


    // =========================================================
    // BUSCAR CURSOS COORDENADOS
    // =========================================================

    findCursosCoordenados = async (registro) => {

        console.log(
            "🟢 ProfessorDAO.findCursosCoordenados():",
            registro
        );

        const SQL = `

            SELECT

                c.idCurso,

                c.nomeCurso

            FROM coordenador_curso cc

            INNER JOIN curso c
                ON c.idCurso = cc.Curso_idCurso

            WHERE
                cc.Professor_registro = ?

            ORDER BY
                c.nomeCurso ASC

        `;

        const pool =
            await this.#database.getPool();

        const [
            resultado
        ] = await pool.execute(
            SQL,
            [
                Number(registro)
            ]
        );

        return resultado || [];
    };


    // =========================================================
    // ALIASES PARA CÓDIGO ANTIGO
    // =========================================================

    create = async (objProfessorModel) => {

        return await this.createProfessor(
            objProfessorModel
        );
    };


    update = async (objProfessorModel) => {

        return await this.updateProfessor(
            objProfessorModel
        );
    };


    delete = async (objProfessorModel) => {

        return await this.deleteProfessor(
            objProfessorModel.registro
        );
    };

};