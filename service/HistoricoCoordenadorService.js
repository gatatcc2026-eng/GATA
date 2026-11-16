module.exports = class HistoricoCoordenadorService {

    #historicoCoordenadorDAO;

    constructor(historicoCoordenadorDAODependency) {
        console.log("✅ HistoricoCoordenadorService.constructor()");
        this.#historicoCoordenadorDAO = historicoCoordenadorDAODependency;
    }

    registrar = async (registroProfessor, acao, descricao, idCurso = null) => {

        let cursoFinal = null;

        /* se vier curso, precisa ser um ID válido */
        if (idCurso !== undefined && idCurso !== null && idCurso !== "") {

            cursoFinal = Number(idCurso);

            if (!Number.isInteger(cursoFinal) || cursoFinal <= 0) {
                throw new Error("O curso informado para o histórico é inválido!");
            }
        }

        /* sem curso informado, usa o curso do coordenador */
        if (cursoFinal === null) {

            const cursos = await this.#historicoCoordenadorDAO
                .cursosDoCoordenador(registroProfessor);

            cursoFinal = cursos.length > 0 ? cursos[0] : null;
        }

        return this.#historicoCoordenadorDAO.registrar(
            registroProfessor,
            acao,
            descricao,
            cursoFinal
        );
    };

    /* só devolve o histórico dos cursos do coordenador logado */
    findAll = async (registroProfessor) => {

        const cursos = await this.#historicoCoordenadorDAO
            .cursosDoCoordenador(registroProfessor);

        return this.#historicoCoordenadorDAO.findAll(cursos);
    };
};