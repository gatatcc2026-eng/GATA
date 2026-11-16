function mostrarPopup(
    mensagem,
    tipo = "erro",
    titulo = "Atenção"
) {

    const popupExistente =
        document.querySelector(
            ".popup-mensagem"
        );


    if (popupExistente) {

        popupExistente.remove();

    }


    const popup =
        document.createElement(
            "div"
        );


    popup.className =
        `popup-mensagem popup-${tipo}`;


    let icone = "!";


    if (tipo === "sucesso") {

        icone = "✓";

    } else if (tipo === "info") {

        icone = "i";

    }


    popup.innerHTML = `

        <div class="popup-icone">
            ${icone}
        </div>

        <div class="popup-conteudo">

            <strong>
                ${titulo}
            </strong>

            <span>
                ${mensagem}
            </span>

        </div>

        <button
            class="popup-fechar"
            type="button"
        >
            ×
        </button>

    `;


    document.body.appendChild(
        popup
    );


    const botaoFechar =
        popup.querySelector(
            ".popup-fechar"
        );


    if (botaoFechar) {

        botaoFechar.addEventListener(
            "click",
            () => {

                popup.classList.remove(
                    "popup-visivel"
                );


                setTimeout(
                    () => {

                        if (
                            popup.parentElement
                        ) {

                            popup.remove();

                        }

                    },
                    300
                );

            }
        );

    }


    setTimeout(
        () => {

            popup.classList.add(
                "popup-visivel"
            );

        },
        10
    );


    setTimeout(
        () => {

            if (
                popup &&
                popup.parentElement
            ) {

                popup.classList.remove(
                    "popup-visivel"
                );


                setTimeout(
                    () => {

                        if (
                            popup.parentElement
                        ) {

                            popup.remove();

                        }

                    },
                    300
                );

            }

        },
        5000
    );

}


function popupErro(
    mensagem,
    titulo = "Atenção"
) {

    mostrarPopup(
        mensagem,
        "erro",
        titulo
    );

}


function popupSucesso(
    mensagem,
    titulo = "Sucesso"
) {

    mostrarPopup(
        mensagem,
        "sucesso",
        titulo
    );

}


function popupInfo(
    mensagem,
    titulo = "Informação"
) {

    mostrarPopup(
        mensagem,
        "info",
        titulo
    );

}


/* =========================================================
   POPUP DE CONFIRMAÇÃO (substitui o confirm() nativo)
   Uso: const ok = await popupConfirmar("mensagem", "título");
========================================================= */

function popupConfirmar(
    mensagem,
    titulo = "Confirmar ação"
) {

    return new Promise(
        (resolve) => {

            const overlayExistente =
                document.querySelector(
                    ".popup-confirmar-overlay"
                );


            if (overlayExistente) {

                overlayExistente.remove();

            }


            const overlay =
                document.createElement(
                    "div"
                );


            overlay.className =
                "popup-confirmar-overlay";


            overlay.innerHTML = `

                <div class="popup-confirmar-caixa">

                    <div class="popup-confirmar-icone">
                        !
                    </div>

                    <div class="popup-confirmar-texto">

                        <strong>
                            ${titulo}
                        </strong>

                        <p>
                            ${mensagem}
                        </p>

                    </div>

                    <div class="popup-confirmar-acoes">

                        <button
                            class="popup-confirmar-btn popup-confirmar-btn-cancelar"
                            type="button"
                            data-acao="cancelar"
                        >
                            Cancelar
                        </button>

                        <button
                            class="popup-confirmar-btn popup-confirmar-btn-confirmar"
                            type="button"
                            data-acao="confirmar"
                        >
                            Confirmar
                        </button>

                    </div>

                </div>

            `;


            document.body.appendChild(
                overlay
            );


            function fechar(resultado) {

                overlay.classList.remove(
                    "popup-confirmar-visivel"
                );


                setTimeout(
                    () => {

                        if (
                            overlay.parentElement
                        ) {

                            overlay.remove();

                        }

                    },
                    200
                );


                resolve(
                    resultado
                );

            }


            overlay
                .querySelector(
                    '[data-acao="cancelar"]'
                )
                .addEventListener(
                    "click",
                    () => fechar(false)
                );


            overlay
                .querySelector(
                    '[data-acao="confirmar"]'
                )
                .addEventListener(
                    "click",
                    () => fechar(true)
                );


            overlay.addEventListener(
                "click",
                (evento) => {

                    if (
                        evento.target === overlay
                    ) {

                        fechar(false);

                    }

                }
            );


            const handleEsc =
                (evento) => {

                    if (evento.key === "Escape") {

                        fechar(false);

                        document.removeEventListener(
                            "keydown",
                            handleEsc
                        );

                    }

                };


            document.addEventListener(
                "keydown",
                handleEsc
            );


            setTimeout(
                () => {

                    overlay.classList.add(
                        "popup-confirmar-visivel"
                    );

                },
                10
            );

        }
    );

}