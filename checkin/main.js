const updateAtTime = 30

// ----------------------------------------------------------------------------

const baseUrl = "http://200.135.34.151/etic-2018/server/apiRequests.php"
const api =
{
    "eticoins-por-inscrito": id => `${baseUrl}?option=carregarEticoins&id=${parseInt(id)}`,
    "registrar-entrada": `${baseUrl}?option=registrarPresencas`,
    "registrar-entrada-permissiva": `${baseUrl}?option=registrarPresencasPermissiva`,
    "evento": e => `${baseUrl}?option=carregarAtividadeUnica&id=${e}`,
    "eventos": `${baseUrl}?option=carregarTodasAtividades`,
    "carregar-inscritos": `${baseUrl}?option=carregarTodosInscritos`,
    "carregar-inscritos-por-evento": e => `${baseUrl}?option=carregarInscritos&id=${e}`,
}

const n =
{
    "eticoins-por-inscrito": id => `api/eticoins-por-inscrito.php?id=${id}`,
    "registrar-entrada": "",
    "registrar-entrada-permissiva": "",
    "evento": e => `api/evento.php?id=${e}`,
    "eventos": "api/eventos.php",
    "carregar-inscritos": "api/inscritos.php",
    "carregar-inscritos-por-evento": "",
}

// ----------------------------------------------------------------------------

let mobile = /Mobi|Android|iPad|iPhone/i.test(navigator.userAgent)
const domOptions = document.querySelector('#options')
const domOptionClose = domOptions.querySelector('.close')
const domOptionWaitList = document.querySelector('#lista-de-espera')
const domOptionFree = document.querySelector('#entrada-de-nao-cadastrados')
const domSelectEvents = document.querySelector('#selecionar-evento')
const domBubbleTimeLeft = document.querySelector('.time-left')
const domBubbleInsc = document.querySelector('.insc')
const domQrcodeInput = document.querySelector('.qrcode input')
const domInscritos = document.querySelector('.inscritos')
const domVideo = document.querySelector('video')
const domMsgs = document.querySelector('.msgs')
const domEticoins = document.querySelector('.eticoins .points')
const domEticoinsName = document.querySelector('.eticoins .nome')
const args = document.location.search.substr(1).split(':')
const event = args[0] || null
const camNo = args[1] || 0
const localName = `joined-${event}`

let joined = JSON.parse(localStorage.getItem(localName)) || []
let sincronized = []
let updateTimeLeft = updateAtTime
let saving = false
let confIsOpen = false
let valorEvento = 0

const init = () => {
    scanner()
    attachEvents()
    loadEventData(event)
    loadEnrolledData(event)

    let tickTimeLeftController = setInterval(tickTimeLeft, 1000)

    if (!event) {
        saving = true
        clearInterval(tickTimeLeftController)
    }
}

const save = async () => {
    if (!joined.length)
        return updateTimeLeft = updateAtTime

    let link = (domOptionFree.checked)
        ? api["registrar-entrada-permissiva"]
        : api["registrar-entrada"]

    saving = true

    let req = await fetch(link, {
        method: "POST",
        body: JSON.stringify({
            id: event,
            usuarios: joined
        })
    })

    let res = await req.json()

    if (res.status == 200) {
        sincronized = sincronized.concat(joined)
        joined = []
        localStorage.setItem(localName, JSON.stringify(joined))
    }

    saving = false
    domBubbleInsc.innerText = joined.length
    updateTimeLeft = updateAtTime
}

const showLocalStored = () => {
    domBubbleInsc.innerText = joined.length
    joined.forEach(id => {
        if (!id) return
        let el = document.querySelector(`[data-id="${id.toString()}"]`)
        if (el) el.classList.add('selected')
    })
}

const scanner = async () => {
    let scanner = new Instascan.Scanner({
        video: domVideo,
        refractoryPeriod: 3000
    })

    try {
        let cameras = await Instascan.Camera.getCameras()
        if (cameras.length > 0)
            scanner.start(cameras[camNo])
        else
            alert('No cameras found.')
    } catch (e) {
        console.error(e)
    }

    scanner.addListener('scan', v => saveTrigger(v))
}

const loadEventData = async evento => {
    if (!event)
        return document.querySelector('.title').innerText = "saldo eticoins"

    let req = await fetch(api.evento(event))
    let res = await req.json()
    valorEvento = parseInt(res.eticoin)
    document.querySelector('.title').innerText = res.nome
}

const loadEnrolledData = async evento => {
    let req = !evento
        ? await fetch(api["carregar-inscritos"])
        : await fetch(api["carregar-inscritos-por-evento"](evento))

    let res = await req.json()
    let lis = document.querySelector('.inscritos')

    res.forEach(ins => {
        let className = []

        if (parseInt(ins.presenca)) {
            className.push("selected")
            sincronized.push(parseInt(ins.id))
        }

        if (parseInt(ins.espera))
            className.push("espera")

        lis.innerHTML += `<div class="${className.join(" ")}" data-espera="${ins.espera}" data-id="${ins.id}">${ins.nome.toLowerCase()}</div>`
    })

    showLocalStored()
}

let rollDiceFetchController

const rollDice = async (id, name) => {
    if (rollDiceFetchController)
        rollDiceFetchController.abort()

    rollDiceFetchController = new AbortController()

    let animating = false
    let signal = rollDiceFetchController.signal

    const animate = () => {
        let startAt = 99
        let animationCurrent = startAt
        animating = true
        const doTheMagic = () => {
            if (!animating) return
            animationCurrent = --animationCurrent || startAt
            domEticoins.innerText = animationCurrent
            window.requestAnimationFrame(doTheMagic)
        }
        doTheMagic()
    }

    const stopAnimate = value => {
        animating = false
        domEticoins.innerText = parseInt(value) + (sincronized.includes(parseInt(id)) ? 0 : valorEvento)
    }

    const success = value => {
        setTimeout(() => {
            stopAnimate( parseInt(value.eticoinsTotais) - parseInt(value.eticoinsGastos) )
            let v = domEticoinsName.innerText = value.nome.split(' ')[0].toLowerCase()
            v = v.charAt(0).toUpperCase() + v.substr(1)
            domEticoinsName.innerText = v
        }, 1000)
    }

    const fail = error => {
        stopAnimate('---')
        domEticoinsName.innerText = "..."
    }

    if (!mobile)
        animate()

    domEticoinsName.innerText = name

    fetch(api["eticoins-por-inscrito"](id), { signal })
        .then(r => r.json())
        .then(success)
        .catch(fail)
}

const msg = (type, msg) => {
    domMsgs.classList.remove('show')
    setTimeout(() => {
        domMsgs.dataset.type = type
        domMsgs.innerText = msg
        domMsgs.classList.add('show')
    }, 300)
}

const localStock = (id, target) => {
    id = parseInt(id)

    if (!joined.includes(id) && !sincronized.includes(id)) {
        joined.push(id)
        domBubbleInsc.innerText = joined.length
    }

    localStorage.setItem(localName, JSON.stringify(joined))
}

const toggleConf = async () => {
    confIsOpen = !confIsOpen
    domOptions.classList.toggle('show')
    if (domOptions.classList.contains('show')) {
        domSelectEvents.innerHTML = '<option>loading</option>'
        domSelectEvents.innerHTML += '<option value="">saldo de eticoins</option>'
        const load = async () => {
            let req = await fetch(api.eventos)
            let res = await req.json()
            domSelectEvents.querySelector("option").innerText = "selecione um evento"
            res.forEach(ev => {
                domSelectEvents.innerHTML += `<option value="${ev.id}">${ev.nome.toLowerCase()}</option>`
            })
        }
        load()
    }
}

const saveTrigger = id => {
    id = id.substr(0, 5)

    if (id == "confi" || id == "conf")
        return toggleConf()

    let target = document.querySelector(`[data-id="${parseInt(id)}"]`)


    if (!target && domOptionFree.checked) {
        msg('ok', `seja bem vindo, forasteiro!`)
        localStock(id)
        rollDice(id, "")
        return
    }

    if (!target)
        return msg('error', `Você não esta cadastrado neste evento!`)

    let name = target.innerText.split(' ')[0]

    if (target.dataset.espera == "1" && !domOptionWaitList.checked)
        return msg('espera', `Olá, ${name}! aguarde a lista de espera ser liberada e tente novamente.`)

    localStock(id, target)
    rollDice(id, name)
    msg('ok', `Olá, ${name}!`)
    domInscritos.scrollTop = target.offsetTop - domInscritos.offsetTop - (domInscritos.offsetHeight / 2)
    target.classList.add('selected')
}

const tickTimeLeft = () => {
    if (saving)
        return

    updateTimeLeft--

    if (updateTimeLeft == 0)
        save()

    domBubbleTimeLeft.innerText = updateTimeLeft
}

// -- Attach Events ---------------------------------------------------

const attachEvents = () => {
    domQrcodeInput.addEventListener('keyup', ev => {
        if (domQrcodeInput.value.length < 5) return
        let value = ev.target.value
        ev.preventDefault()
        domQrcodeInput.value = ''
        saveTrigger(value)
    })

    domSelectEvents.addEventListener('change', ev => location = "?" + domSelectEvents.value)
    domOptionClose.addEventListener('click', ev => domOptions.classList.remove('show'))
    domMsgs.addEventListener('transitionend', ev => domMsgs.classList.remove('show'))
    domMsgs.addEventListener('animationend', ev => domMsgs.classList.remove('show'))
    window.addEventListener('keydown', ev => domQrcodeInput.focus())
}

// -- Default Events ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", init)