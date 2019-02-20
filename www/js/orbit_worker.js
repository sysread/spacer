"use strict"

/*
 * Convenience functions to convert degrees to normalized radians.
 */
const circleInRadians = 2 * Math.PI
const ratioDegToRad   = Math.PI / 180
const rad             = (n) => n * ratioDegToRad
const nrad            = (n) => (n * ratioDegToRad) % circleInRadians


/*
 * Convenience functions to work with time stamps
 */
const J2000            = Date.UTC(2000, 0, 1, 12, 0, 0)
const DayInMS          = 24 * 60 * 60 * 1000
const CenturyInMS      = 100 * 365.24 * DayInMS
const daysBetween      = (a, b) => (a - b) / DayInMS
const centuriesBetween = (a, b) => (a - b) / CenturyInMS


const elements = ['a', 'e', 'i', 'L', 'lp', 'node'];


const period = (body, time, a) => {
  if (!body.central)
    return 0

  let period = 0

  if (body.central)
    period = 2 * Math.PI * Math.sqrt((a * a * a) / body.central.mu)

  return period
}


const getElementAtTime = (body, time, element) => {
  let value = body.elements.base[element]

  if (body.elements.cy !== undefined && body.elements.cy[element] !== undefined)
    value += body.elements.cy[element] * centuriesBetween(time, J2000)

  return value
}


const getElementsAtTime = (body, time) => {
  const result = {}

  for (const element of elements)
    result[element] = getElementAtTime(body, time, element)

  result.w = result.lp - result.node
  result.M = getMeanAnomaly(body, result.L, result.lp, time)
  result.E = getEccentricAnomaly(body, result.M, result.e)
  result.period = period(body, time, result.a)

  return result
}

const getMeanAnomaly = (body, L, lp, t) => {
  let M = L - lp

  if (body.elements) {
    if (body.elements.day)
      M += body.elements.day.M * daysBetween(t, J2000)

    if (body.elements.aug) {
      const T = centuriesBetween(t, J2000)
      const b = body.elements.aug.b
      const c = body.elements.aug.c
      const s = body.elements.aug.s
      const f = body.elements.aug.f

      if (b != undefined)
        M += T * T * b

      if (f != undefined) {
        if (c != undefined)
          M += c * Math.cos(f * T)

        if (s != undefined)
          M += s * Math.sin(f * T)
      }
    }
  }

  return M
}

const getEccentricAnomaly = (body, M, e) => {
  let E = M;

  while (true) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE

    if (Math.abs(dE) < (1e-6))
      break
  }

  return E
}


onmessage = (e) => {
  const {time, body} = e.data

  postMessage({
    result: getElementsAtTime(body, time),
    time:   time,
  })
}
