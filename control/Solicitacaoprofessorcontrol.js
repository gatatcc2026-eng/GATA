module.exports = class SolicitacaoProfessorControl {

    #service;


    constructor(service) {

        console.log("✅ SolicitacaoProfessorControl.constructor()");

        this.#service = service;
    }


    // GET /disponiveis?termo=
    disponiveis = async (req, res, next) => {

        try {

            const lista = await this.#service.buscarDisponiveis(req.user, req.query.termo);

            return res.status(200).json(lista);

        } catch (error) {

            next(error);
        }
    };


    // GET /
    index = async (req, res, next) => {

        try {

            const lista = await this.#service.listar(req.user);

            return res.status(200).json(lista);

        } catch (error) {

            next(error);
        }
    };


    // GET /pendentes/total
    totalPendentes = async (req, res, next) => {

        try {

            const total = await this.#service.contarPendentes(req.user);

            return res.status(200).json({ total });

        } catch (error) {

            next(error);
        }
    };


    // POST /   body: { registroProfessor, idCursoOrigem }
    store = async (req, res, next) => {

        try {

            const idSolicitacao = await this.#service.criar(req.user, req.body);

            return res.status(201).json({
                message: "Solicitação enviada com sucesso!",
                idSolicitacao
            });

        } catch (error) {

            next(error);
        }
    };


    // PATCH /:id/aceitar
    aceitar = async (req, res, next) => {

        console.log("✅ SolicitacaoProfessorControl.aceitar() v2 | id:", req.params.id, "| user:", req.user?.registro, req.user?.cursoCoordenado);

        try {

            await this.#service.aceitar(req.user, req.params.id);

            return res.status(200).json({ message: "Solicitação aceita! O professor foi adicionado ao curso." });

        } catch (error) {

            next(error);
        }
    };


    // PATCH /:id/recusar
    recusar = async (req, res, next) => {

        console.log("✅ SolicitacaoProfessorControl.recusar() v2 | id:", req.params.id, "| user:", req.user?.registro, req.user?.cursoCoordenado);

        try {

            await this.#service.recusar(req.user, req.params.id);

            return res.status(200).json({ message: "Solicitação recusada." });

        } catch (error) {

            next(error);
        }
    };

};