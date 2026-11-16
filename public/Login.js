// =========================================================
// LOGIN GATA
// =========================================================

let tabAtiva = "aluno";


// =========================================================
// INICIALIZAÇÃO
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    const tabAluno =
        document.getElementById("tabAluno");

    const tabProfessor =
        document.getElementById("tabProfessor");

    const btnEntrar =
        document.getElementById("btnEntrar");

    const inputIdentificador =
        document.getElementById("inputIdentificador");

    const inputSenha =
        document.getElementById("inputSenha");


    // =====================================================
    // BOTÃO ALUNO
    // =====================================================

    tabAluno.addEventListener("click", () => {

        trocarTab("aluno");

    });


    // =====================================================
    // BOTÃO PROFESSOR
    // =====================================================

    tabProfessor.addEventListener("click", () => {

        trocarTab("professor");

    });


    // =====================================================
    // BOTÃO ENTRAR
    // =====================================================

    btnEntrar.addEventListener("click", () => {

        entrar();

    });


    // =====================================================
    // ENTER NO CAMPO DE SENHA
    // =====================================================

    inputSenha.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {

                entrar();

            }

        }
    );


    // =====================================================
    // ABA INICIAL
    // =====================================================

    trocarTab("aluno");

});


// =========================================================
// TROCAR ABA
// =========================================================

function trocarTab(tipo) {

    tabAtiva = tipo;


    const tabAluno =
        document.getElementById("tabAluno");

    const tabProfessor =
        document.getElementById("tabProfessor");

    const label =
        document.getElementById(
            "labelIdentificador"
        );

    const input =
        document.getElementById(
            "inputIdentificador"
        );

    const senha =
        document.getElementById(
            "inputSenha"
        );


    tabAluno.classList.toggle(
        "ativo",
        tipo === "aluno"
    );


    tabProfessor.classList.toggle(
        "ativo",
        tipo === "professor"
    );


    if (tipo === "aluno") {

        label.textContent =
            "Matrícula";

        input.placeholder =
            "Ex.: 20250001";

    } else {

        label.textContent =
            "Registro";

        input.placeholder =
            "Ex.: 1234";

    }


    input.value = "";
    senha.value = "";

    esconderErro();

}


// =========================================================
// ENTRAR
// =========================================================

async function entrar() {

    const input =
        document.getElementById(
            "inputIdentificador"
        );

    const inputSenha =
        document.getElementById(
            "inputSenha"
        );

    const btn =
        document.getElementById(
            "btnEntrar"
        );


    const identificador =
        input.value.trim();

    const senha =
        inputSenha.value;


    // =====================================================
    // VALIDAÇÃO
    // =====================================================

    if (!identificador || !senha) {

        mostrarErro(
            "Preencha todos os campos."
        );

        return;
    }


    btn.classList.add(
        "carregando"
    );

    btn.disabled = true;

    esconderErro();


    try {

        let url;
        let dados;


        // =================================================
        // ALUNO
        // =================================================

        if (tabAtiva === "aluno") {

            url =
                "/api/v1/alunos/login";

            dados = {

                matricula:
                    identificador,

                senha:
                    senha

            };


        // =================================================
        // PROFESSOR
        // =================================================

        } else {

            url =
                "/api/v1/professores/login";

            dados = {

                registro:
                    identificador,

                senha:
                    senha

            };

        }


        // =================================================
        // LOGIN
        // =================================================

        const response =
            await fetch(
                url,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(dados)
                }
            );


        const resposta =
            await response
                .json()
                .catch(() => null);


        // =================================================
        // ERRO
        // =================================================

        if (!response.ok) {

            throw new Error(
                resposta?.message ||
                resposta?.msg ||
                resposta?.error ||
                "Credenciais inválidas."
            );

        }


        // =================================================
        // TOKEN
        // =================================================

        if (
            !resposta ||
            !resposta.token
        ) {

            throw new Error(
                "O servidor não retornou o token."
            );

        }


        // =================================================
        // LIMPAR SESSÃO DA ABA ATUAL
        // =================================================

        sessionStorage.removeItem("token");
        sessionStorage.removeItem("tipo");
        sessionStorage.removeItem("dadosAluno");
        sessionStorage.removeItem("dadosProfessor");


        // =================================================
        // SALVAR NOVA SESSÃO NA ABA ATUAL
        // =================================================

        sessionStorage.setItem(
            "token",
            resposta.token
        );

        sessionStorage.setItem(
            "tipo",
            tabAtiva
        );


        // =================================================
        // ALUNO
        // =================================================

        if (tabAtiva === "aluno") {

            sessionStorage.setItem(
                "dadosAluno",
                JSON.stringify(
                    resposta.aluno
                )
            );


            window.location.replace("/aluno"); 

            return;
        }


        // =================================================
        // PROFESSOR
        // =================================================

        sessionStorage.setItem(
            "dadosProfessor",
            JSON.stringify(
                resposta.professor
            )
        );


        // =================================================
        // COORDENADOR
        // =================================================

        if (
            resposta.professor &&
            (
                resposta.professor.coordenador == 1 ||
                resposta.professor.coordenador === true
            )
        ) {

            window.location.replace("/coordenador");

        } else {

            window.location.replace("/professor");

        }


    } catch (erro) {
        mostrarErro(
            erro.message ||
            "Erro ao conectar com o servidor."
        );


    } finally {

        btn.classList.remove(
            "carregando"
        );

        btn.disabled = false;

    }

}


// =========================================================
// MOSTRAR ERRO
// =========================================================

function mostrarErro(msg) {

    const erroBox =
        document.getElementById(
            "erroBox"
        );

    const erroMsg =
        document.getElementById(
            "erroMsg"
        );


    erroMsg.textContent =
        msg;


    erroBox.classList.add(
        "visivel"
    );

}


// =========================================================
// ESCONDER ERRO
// =========================================================

function esconderErro() {

    const erroBox =
        document.getElementById(
            "erroBox"
        );


    erroBox.classList.remove(
        "visivel"
    );

}