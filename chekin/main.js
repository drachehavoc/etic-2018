const updateAtTime = 2
const baseUrl = "http://www.etic.ifc-camboriu.edu.br/etic-2018/server/apiRequests.php"

// ----------------------------------------------------------------------------

let updateTimeLeft = updateAtTime
let saving = false

const domBubbleTimeLeft = document.querySelector('.time-left')
const domBubbleInsc = document.querySelector('.insc')
const domQrcodeInput = document.querySelector('.qrcode input')
const domInscritos = document.querySelector('.inscritos')
const domVideo = document.querySelector('video')
const domMsgs = document.querySelector('.msgs')
const domEticoins = document.querySelector('.eticoins .points')
const domEticoinsName = document.querySelector('.eticoins .nome')
const args = document.location.search.substr(1).split(':')
const event = args[0]
const camNo = args[1] || 0
const justInfo = !!args[2] || false
const joined = JSON.parse(localStorage.getItem('joined')) || []

const init = () => {
    if (!event && !justInfo) return alert("!!!")
    scanner()
    attachEvents()
    loadEventData(event)
    loadEnrolledData(event)
    setInterval(tickTimeLeft, 1000)
}

const save = () => {
    saving = true
}

const showLocalStored = () => {
    domBubbleInsc.innerText = joined.length
    joined.forEach(id => {
        let el = document.querySelector(`[data-id="${id.toString()}"]`)
        if (el) el.classList.add('selected')
    })
}

const scanner = async () => {
    let scanner = new Instascan.Scanner({
        video: domVideo,
        refractoryPeriod: 1000
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
    if (justInfo) {
        document.querySelector('.title').innerText = "saldo eticoins"
        return
    }

    // let req = await fetch(`api/evento.php?id=${evento}`)
    let req = await fetch(`${baseUrl}?option=carregarAtividadeUnica&id=${evento}`)
    let res = await req.json()
    document.querySelector('.title').innerText = res.nome
}

const loadEnrolledData = async evento => {
    let req = justInfo
        ? await fetch(`api/inscritos.php`)
        // : await fetch(`api/inscritos-por-evento.php?id=${evento}`)
        : await fetch(`${baseUrl}?option=carregarInscritos&id=${evento}`)
    let res = await req.json()
    let lis = document.querySelector('.inscritos')
    res.forEach(ins => { 
        let presente = parseInt(ins.presenca) ? ' class="selected"' : ''
        lis.innerHTML += `<div data-id="${ins.id}"${presente}>${ins.nome.toLowerCase()}</div>`
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
            domEticoins.innerText = animationCurrent+"/"+animationCurrent
            window.requestAnimationFrame(doTheMagic)
        }
        doTheMagic()
    }

    const stopAnimate = value => {
        animating = false
        domEticoins.innerText = value
    }

    const success = value => {
        setTimeout(() => stopAnimate(value), 1000)
    }

    const fail = error => {
        stopAnimate('---')
        domEticoinsName.innerText = "..."
    }

    animate()

    domEticoinsName.innerText = name

    fetch(`api/eticoins-por-inscrito.php?id=${id}`, { signal })
        .then(r => r.text())
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

const localStock = id => {
    if (justInfo) 
        return

    id = parseInt(id)

    if ( !joined.includes(id) )
        joined.push(id)

    localStorage.setItem('joined', JSON.stringify(joined))
}

const saveTrigger = id => {
    id = id.substr(0, 4)
    let target = document.querySelector(`[data-id="${parseInt(id)}"]`)
    if (!target) return msg('error', `Você não esta cadastrado neste evento!`)
    let name = target.innerText
    localStock(id)
    rollDice(id, name)
    msg('ok', `Olá, ${name.split(' ')[0]}!`)
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
        if (ev.target.value.length < 4) return
        let value = ev.target.value
        ev.preventDefault()
        ev.target.value = ''
        saveTrigger(value)
    })

    domMsgs.addEventListener('transitionend', ev => domMsgs.classList.remove('show'))
    domMsgs.addEventListener('animationend', ev => domMsgs.classList.remove('show'))
    window.addEventListener('keydown', ev => domQrcodeInput.focus())
}

// -- Default Events ----------------------------------------------------------

document.addEventListener("DOMContentLoaded", init)