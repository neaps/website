import React, { useState } from 'react'
import Layout from '../../components/layout/default'
import Container from '../../components/container'
import { graphql, navigate } from 'gatsby'
import uuid from 'uuid'
import Alert from '../../components/alert'
import styled from '@emotion/styled'
import Table from '../../components/table'
import Code from '../../components/code'
import { LeadParagraph } from '../../components/type'
import { Flex, Box } from '@rebass/grid/emotion'
import { ButtonLooksLikeLink } from '../../components/button'
import { FormInput, FormSelect, FormSubmit } from '../../components/forms'
import allTimezones from 'moment-timezone/data/packed/latest.json'
import moment from 'moment-timezone'
import colors from '../../style/colors'

const SampleFlex = styled(Flex)`
  border-top: ${colors.primary.dark} 2px solid;
`

const PreviewBox = styled(Box)`
  background: ${colors.primary.dark};
  color: #fff;
`

const timezoneList = ['UTC/GMT']
allTimezones.zones.forEach(zone => {
  zone = zone.split('|')
  timezoneList.push(zone[0])
})

const sampleData = `2009-01-01 13:00:00, 1.23
2009-01-01 14:00:00, -1.150
2009-01-01 15:00:00, 1.53`

const getTime = (time, timeFormat, dataTimezone, stationTimezone) => {
  if (timeFormat === 'timestamp') {
    return moment.unix(time).format('YYYY-MM-DDTHH:MM:SS')
  }
}

/***** TO DO: Find REAL Metric conversion! */

const parseLevels = (
  levels,
  delimiter,
  units,
  timeFormat,
  dataTimezone,
  stationTimezone,
  limit
) => {
  delimiter = typeof delimiter !== 'undefined' ? delimiter : ','
  units = typeof units !== 'undefined' ? units : 'metric'
  limit = typeof limit !== 'undefined' ? limit - 1 : false
  const results = []
  let error = false
  levels.split(/\n/).forEach((level, index) => {
    if (error) {
      return
    }
    if (level.split(delimiter).length !== 2) {
      error = `Line ${index + 1} does not contain the delimiter "${delimiter}".`
      return
    }
    const height = parseFloat(level.split(delimiter)[1].trim())
    const time = getTime(
      level.split(delimiter)[0].trim(),
      timeFormat,
      dataTimezone,
      stationTimezone
    )
    if (!time) {
      error = `Line ${index + 1} has an un-parseable time.`
    }
    if (limit && index >= limit) {
      return
    }
    results.push({
      t: time,
      v: units === 'metric' ? height : height * 3
    })
  })
  return {
    results: results,
    error: error
  }
}

const HarmonicsPage = ({ data }) => {
  const [levels, setLevels] = useState(false)
  const [units, setUnits] = useState('metric')
  const [delimiter, setDelimiter] = useState(',')
  const [dataTimezone, setDataTimezone] = useState(false)
  const [stationTimezone, setStationTimezone] = useState(false)
  const [timeFormat, setTimeFormat] = useState('timestamp')

  return (
    <Layout title="Generate tide harmonics">
      <Container>
        <LeadParagraph>
          Convert water level observations to tidal constituents.
        </LeadParagraph>
        <p>
          Tide constituents should be derived from good data that is sampled at
          least once an hour, and over a year or more.
        </p>
      </Container>
      <SampleFlex>
        <Box width={[1 / 2]} p={4}>
          <Container>
            <form
              onSubmit={event => {
                event.preventDefault()
                const id = uuid()
                fetch(`${data.site.siteMetadata.harmonicsServer}generate`, {
                  method: 'POST',
                  mode: 'cors',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    uuid: id,
                    levels: parseLevels(
                      levels,
                      delimiter,
                      units,
                      dataTimezone,
                      stationTimezone
                    )
                  })
                })
                navigate(`/harmonics/status?id=${id}`)
              }}
            >
              {!levels ? (
                <>
                  <h3 id="data-file-label">Data file</h3>
                  <p>
                    Your file should be in a simple CSV format, without quotes:
                  </p>
                  <Code code={sampleData} language="text" />
                  <FormInput
                    type="file"
                    aria-labelledby="data-file-label"
                    onChange={event => {
                      const reader = new FileReader()
                      reader.onloadend = function() {
                        setLevels(reader.result)
                      }
                      reader.readAsText(event.target.files[0])
                    }}
                  />
                </>
              ) : (
                <>
                  <p>
                    <ButtonLooksLikeLink
                      onClick={event => {
                        event.preventDefault()
                        setLevels(false)
                      }}
                    >
                      Start over
                    </ButtonLooksLikeLink>
                  </p>
                  <label htmlFor="delimiter">Field delimiter</label>
                  <FormInput
                    id="delimiter"
                    defaultValue=","
                    onChange={event => {
                      setDelimiter(event.target.value)
                    }}
                  />
                  <label htmlFor="units">Units</label>
                  <FormSelect
                    id="units"
                    onChange={event => {
                      setUnits(event.target.value)
                    }}
                  >
                    <option value="metric">Metric</option>
                    <option value="english">English</option>
                  </FormSelect>
                  <label htmlFor="time-format">Time format</label>
                  <FormSelect
                    id="time-format"
                    onChange={event => {
                      setTimeFormat(event.target.value)
                    }}
                  >
                    <option value="timestamp">UNIX timestamp</option>
                  </FormSelect>
                  <label htmlFor="timezone_data">Timezone of data</label>
                  <FormSelect
                    id="timezone_data"
                    onChange={event => {
                      setDataTimezone(event.target.value)
                    }}
                  >
                    {timezoneList.map(timezone => (
                      <option value={timezone}>{timezone}</option>
                    ))}
                  </FormSelect>
                  <label htmlFor="timezone_data">Timezone of station</label>
                  <FormSelect
                    id="timezone_data"
                    onChange={event => {
                      setStationTimezone(event.target.value)
                    }}
                  >
                    {timezoneList.map(timezone => (
                      <option value={timezone}>{timezone}</option>
                    ))}
                  </FormSelect>
                  <FormSubmit value="Confirm data" />
                </>
              )}
            </form>
          </Container>
        </Box>
        <PreviewBox width={[1 / 2]} p={4}>
          <h3>Preview</h3>
          {levels && (
            <>
              {parseLevels(
                levels,
                delimiter,
                units,
                timeFormat,
                dataTimezone,
                stationTimezone,
                10
              ).error ? (
                <Alert>
                  {
                    parseLevels(
                      levels,
                      delimiter,
                      units,
                      timeFormat,
                      dataTimezone,
                      stationTimezone,
                      10
                    ).error
                  }
                </Alert>
              ) : (
                <>
                  <p>All dates are in UTC, heights in meters.</p>
                  <Table light={true}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parseLevels(
                        levels,
                        delimiter,
                        units,
                        timeFormat,
                        dataTimezone,
                        stationTimezone,
                        10
                      ).results.map((level, index) => (
                        <tr key={`preview-${index}`}>
                          <td>{level.t}</td>
                          <td>{level.v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </>
              )}
            </>
          )}
        </PreviewBox>
      </SampleFlex>
    </Layout>
  )
}

export default HarmonicsPage

export const query = graphql`
  {
    site {
      siteMetadata {
        harmonicsServer
      }
    }
  }
`
