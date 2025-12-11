// Crosstab Analysis Templates - Common Use Cases

// ============================================================================
// TEMPLATE INTERFACE
// ============================================================================

interface AnalysisTemplate {
  name: string;
  description: string;
  applicableWhen: (crosstab: any) => boolean;
  analyze: (crosstab: any, analysis: any) => TemplateAnalysis;
}

interface TemplateAnalysis {
  summary: string;
  keyMetrics: KeyMetric[];
  insights: string[];
  visualizations?: VisualizationSpec[];
  recommendations: string[];
}

interface KeyMetric {
  label: string;
  value: string | number;
  context?: string;
  significance?: 'positive' | 'negative' | 'neutral';
}

interface VisualizationSpec {
  type: 'heatmap' | 'bar' | 'line' | 'table';
  title: string;
  data: any;
}

// ============================================================================
// TEMPLATE 1: AUDIENCE PROFILING
// ============================================================================

const AudienceProfilingTemplate: AnalysisTemplate = {
  name: 'Audience Profiling',
  description: 'Comprehensive demographic and behavioral profile of an audience',
  
  applicableWhen: (crosstab) => {
    // Applies when analyzing a single audience across multiple attributes
    return crosstab.bases && crosstab.bases.length === 1 &&
           crosstab.rows.length > 5;
  },
  
  analyze: (crosstab, analysis) => {
    const data = crosstab.data || [];
    const validData = data.filter(d => d.metrics.positive_sample >= 50);
    
    // Segment by categories
    const categories = {
      demographics: validData.filter(d => 
        d.datapoint.includes('q1') || d.datapoint.includes('q2') || 
        d.datapoint.includes('q4') || d.datapoint.includes('age') ||
        d.datapoint.includes('gender')
      ),
      media: validData.filter(d => 
        d.datapoint.includes('q420') || d.datapoint.includes('media') ||
        d.datapoint.includes('platform')
      ),
      interests: validData.filter(d => 
        d.datapoint.includes('q318') || d.datapoint.includes('interest')
      ),
      purchase: validData.filter(d => 
        d.datapoint.includes('purchase') || d.datapoint.includes('brand')
      )
    };
    
    // Find defining characteristics (index > 140)
    const definingTraits = validData
      .filter(d => d.metrics.audience_index > 140)
      .sort((a, b) => b.metrics.audience_index - a.metrics.audience_index)
      .slice(0, 8);
    
    // Calculate profile strength
    const avgIndex = validData.reduce((sum, d) => 
      sum + Math.abs(d.metrics.audience_index - 100), 0
    ) / validData.length;
    
    const profileStrength = avgIndex > 30 ? 'Strong' : 
                           avgIndex > 15 ? 'Moderate' : 'Weak';
    
    return {
      summary: `This audience shows a ${profileStrength.toLowerCase()} profile with ${definingTraits.length} defining characteristics that over-index significantly (>140).`,
      
      keyMetrics: [
        {
          label: 'Profile Strength',
          value: profileStrength,
          context: `Average deviation from baseline: ${Math.round(avgIndex)} points`,
          significance: profileStrength === 'Strong' ? 'positive' : 'neutral'
        },
        {
          label: 'Total Sample Size',
          value: validData.reduce((sum, d) => sum + d.metrics.positive_sample, 0).toLocaleString(),
          context: 'Respondents across all data points'
        },
        {
          label: 'Defining Traits',
          value: definingTraits.length,
          context: 'Behaviors with index >140',
          significance: 'positive'
        }
      ],
      
      insights: [
        `**Core Identity**: The top defining traits are: ${definingTraits.slice(0, 3).map(d => {
          const row = crosstab.rows.find(r => d.datapoint.includes(r.id));
          return row?.name || d.datapoint;
        }).join(', ')} (indexes: ${definingTraits.slice(0, 3).map(d => Math.round(d.metrics.audience_index)).join(', ')})`,
        
        categories.media.length > 0 
          ? `**Media Consumption**: ${categories.media.length} media behaviors analyzed, with strongest affinity for ${categories.media.sort((a, b) => b.metrics.audience_index - a.metrics.audience_index)[0].datapoint}`
          : '**Media Consumption**: Limited media data available',
        
        categories.purchase.length > 0
          ? `**Purchase Behavior**: Shows ${categories.purchase.filter(d => d.metrics.audience_index > 120).length} over-indexed purchase behaviors`
          : '**Purchase Behavior**: Insufficient purchase data',
        
        `**Market Coverage**: Data spans ${crosstab.country_codes.length} market(s): ${crosstab.country_codes.map(c => c.toUpperCase()).join(', ')}`
      ],
      
      recommendations: [
        `**Messaging**: Focus creative on the top 3 defining traits to ensure resonance`,
        `**Channel Strategy**: Prioritize the over-indexed media platforms for efficient reach`,
        profileStrength === 'Strong' 
          ? `**Targeting**: Strong profile enables precise targeting; consider lookalike modeling`
          : `**Targeting**: Consider broader targeting due to weaker differentiation`,
        `**Content**: Create content that aligns with the ${definingTraits.slice(0, 5).length} top interests and behaviors`
      ]
    };
  }
};

// ============================================================================
// TEMPLATE 2: MARKET COMPARISON
// ============================================================================

const MarketComparisonTemplate: AnalysisTemplate = {
  name: 'Market Comparison',
  description: 'Compare audience characteristics across multiple markets',
  
  applicableWhen: (crosstab) => {
    return crosstab.country_codes && crosstab.country_codes.length >= 2;
  },
  
  analyze: (crosstab, analysis) => {
    const markets = crosstab.country_codes;
    const data = crosstab.data || [];
    
    // Group by market
    const byMarket: { [key: string]: any[] } = {};
    markets.forEach(m => {
      byMarket[m] = data.filter(d => d.segment === m);
    });
    
    // Find market-specific strengths
    const marketInsights: { [key: string]: any } = {};
    markets.forEach(market => {
      const marketData = byMarket[market] || [];
      const top = marketData
        .filter(d => d.metrics.positive_sample >= 50)
        .sort((a, b) => b.metrics.audience_index - a.metrics.audience_index)
        .slice(0, 5);
      
      marketInsights[market] = {
        sampleSize: marketData.reduce((sum, d) => sum + d.metrics.positive_sample, 0),
        avgIndex: marketData.length > 0
          ? Math.round(marketData.reduce((sum, d) => sum + d.metrics.audience_index, 0) / marketData.length)
          : 0,
        topBehaviors: top
      };
    });
    
    // Find universal behaviors (over-indexed in all markets)
    const universalBehaviors = [];
    const datapoints = new Set(data.map(d => d.datapoint));
    
    for (const dp of datapoints) {
      const marketIndexes = markets.map(m => {
        const row = byMarket[m]?.find(r => r.datapoint === dp);
        return row ? row.metrics.audience_index : null;
      }).filter(i => i !== null);
      
      if (marketIndexes.length === markets.length && 
          marketIndexes.every(i => i > 120)) {
        universalBehaviors.push({
          datapoint: dp,
          avgIndex: Math.round(marketIndexes.reduce((a, b) => a + b, 0) / marketIndexes.length)
        });
      }
    }
    
    // Find market-specific behaviors (only high in one market)
    const marketSpecific: { [key: string]: any[] } = {};
    for (const dp of datapoints) {
      const marketIndexes = markets.map(m => ({
        market: m,
        index: byMarket[m]?.find(r => r.datapoint === dp)?.metrics.audience_index || 0
      }));
      
      const max = Math.max(...marketIndexes.map(mi => mi.index));
      const maxMarket = marketIndexes.find(mi => mi.index === max)?.market;
      
      if (max > 130 && marketIndexes.filter(mi => mi.index > 120).length === 1) {
        if (!marketSpecific[maxMarket!]) {
          marketSpecific[maxMarket!] = [];
        }
        marketSpecific[maxMarket!].push({ datapoint: dp, index: max });
      }
    }
    
    return {
      summary: `Cross-market analysis reveals ${universalBehaviors.length} universal behaviors and ${Object.keys(marketSpecific).length} markets with unique characteristics.`,
      
      keyMetrics: markets.map(market => ({
        label: market.toUpperCase(),
        value: `Index: ${marketInsights[market].avgIndex}`,
        context: `${marketInsights[market].sampleSize.toLocaleString()} respondents`,
        significance: marketInsights[market].avgIndex > 110 ? 'positive' : 
                     marketInsights[market].avgIndex < 90 ? 'negative' : 'neutral'
      })),
      
      insights: [
        universalBehaviors.length > 0
          ? `**Universal Appeal**: ${universalBehaviors.length} behaviors are strong across all markets (avg index >120), indicating core audience traits that transcend geography`
          : `**No Universal Traits**: Markets show distinct profiles requiring localized strategies`,
        
        ...markets.map(market => {
          const specific = marketSpecific[market] || [];
          const top = marketInsights[market].topBehaviors[0];
          
          return `**${market.toUpperCase()}**: ${specific.length > 0 
            ? `${specific.length} unique strong behaviors. ` 
            : 'Profile similar to other markets. '}Top trait: ${top ? 'index ' + Math.round(top.metrics.audience_index) : 'N/A'}`;
        }),
        
        `**Market Variation**: ${Object.keys(marketSpecific).length} of ${markets.length} markets show distinctive characteristics requiring localized approaches`
      ],
      
      recommendations: [
        universalBehaviors.length > 3
          ? `**Global Strategy**: Lead with universal behaviors (${universalBehaviors.slice(0, 3).map(b => b.datapoint).join(', ')}) for consistent global messaging`
          : `**Localized Strategy**: Minimal overlap suggests market-specific campaigns will perform better than global approach`,
        
        ...markets.filter(m => marketSpecific[m]?.length > 2).map(market =>
          `**${market.toUpperCase()} Tactics**: Emphasize the ${marketSpecific[market].length} market-specific behaviors for local resonance`
        ),
        
        `**Budget Allocation**: Consider weighting toward ${markets.reduce((best, m) => 
          marketInsights[m].avgIndex > marketInsights[best].avgIndex ? m : best
        ).toUpperCase()} which shows strongest overall affinity (index: ${Math.max(...markets.map(m => marketInsights[m].avgIndex))})`
      ]
    };
  }
};

// ============================================================================
// TEMPLATE 3: TREND ANALYSIS (TIME SERIES)
// ============================================================================

const TrendAnalysisTemplate: AnalysisTemplate = {
  name: 'Trend Analysis',
  description: 'Analyze changes in behaviors over time periods',
  
  applicableWhen: (crosstab) => {
    return crosstab.wave_codes && crosstab.wave_codes.length >= 2;
  },
  
  analyze: (crosstab, analysis) => {
    const waves = crosstab.wave_codes;
    const data = crosstab.data || [];
    
    // Group by wave
    const byWave: { [key: string]: any[] } = {};
    waves.forEach(w => {
      byWave[w] = data.filter(d => d.wave === w);
    });
    
    // Calculate wave-over-wave changes
    const trends = [];
    const datapoints = new Set(data.map(d => d.datapoint));
    
    for (const dp of datapoints) {
      const waveData = waves.map(w => {
        const row = byWave[w]?.find(r => r.datapoint === dp);
        return row ? row.metrics.audience_index : null;
      }).filter(i => i !== null);
      
      if (waveData.length >= 2) {
        const first = waveData[0];
        const last = waveData[waveData.length - 1];
        const change = last - first;
        const pctChange = ((last - first) / first) * 100;
        
        if (Math.abs(change) > 15) {
          trends.push({
            datapoint: dp,
            change,
            pctChange: Math.round(pctChange),
            first,
            last,
            direction: change > 0 ? 'Growing' : 'Declining',
            significance: Math.abs(change) > 30 ? 'high' : 
                         Math.abs(change) > 20 ? 'medium' : 'low'
          });
        }
      }
    }
    
    trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    
    const growing = trends.filter(t => t.change > 0);
    const declining = trends.filter(t => t.change < 0);
    
    // Overall trend direction
    const avgChange = trends.length > 0
      ? trends.reduce((sum, t) => sum + t.change, 0) / trends.length
      : 0;
    
    const trendDirection = avgChange > 5 ? 'Strengthening' :
                          avgChange < -5 ? 'Weakening' : 'Stable';
    
    return {
      summary: `Across ${waves.length} time periods, detected ${trends.length} significant behavioral changes. Overall audience profile is ${trendDirection.toLowerCase()}.`,
      
      keyMetrics: [
        {
          label: 'Trend Direction',
          value: trendDirection,
          context: `Average change: ${Math.round(avgChange)} index points`,
          significance: avgChange > 5 ? 'positive' : 
                       avgChange < -5 ? 'negative' : 'neutral'
        },
        {
          label: 'Growing Behaviors',
          value: growing.length,
          context: `${growing.filter(t => t.significance === 'high').length} with high significance`,
          significance: 'positive'
        },
        {
          label: 'Declining Behaviors',
          value: declining.length,
          context: `${declining.filter(t => t.significance === 'high').length} with high significance`,
          significance: 'negative'
        },
        {
          label: 'Time Range',
          value: `${waves[0]} to ${waves[waves.length - 1]}`,
          context: `${waves.length} quarters`
        }
      ],
      
      insights: [
        growing.length > 0
          ? `**Emerging Opportunities**: Top growing behaviors are ${growing.slice(0, 3).map(t => {
              const row = crosstab.rows.find(r => t.datapoint.includes(r.id));
              return `${row?.name || t.datapoint} (+${Math.round(t.change)} pts)`;
            }).join(', ')}`
          : `**No Growth**: No behaviors showing significant growth - audience may be maturing`,
        
        declining.length > 0
          ? `**Declining Affinities**: Watch for erosion in ${declining.slice(0, 3).map(t => {
              const row = crosstab.rows.find(r => t.datapoint.includes(r.id));
              return `${row?.name || t.datapoint} (${Math.round(t.change)} pts)`;
            }).join(', ')}`
          : `**Stable Profile**: No significant behavioral declines observed`,
        
        `**Volatility**: ${trends.filter(t => t.significance === 'high').length} behaviors show high volatility (>30 point swings)`,
        
        trendDirection === 'Strengthening'
          ? `**Opportunity**: Strengthening profile suggests growing market opportunity`
          : trendDirection === 'Weakening'
          ? `**Risk**: Weakening profile may indicate category decline or audience shift`
          : `**Maturity**: Stable profile suggests established, predictable audience`
      ],
      
      recommendations: [
        growing.length > 0
          ? `**Invest in Growth**: Double down on emerging behaviors - ${growing.slice(0, 2).map(t => t.datapoint).join(', ')} showing strongest momentum`
          : `**Maintain Position**: Focus on defending current strengths rather than chasing growth`,
        
        declining.length > 0
          ? `**Address Declines**: Investigate causes of declining behaviors and consider whether to fight or pivot`
          : `**Sustain Engagement**: Continue current strategies to maintain stability`,
        
        `**Forecast Planning**: Use ${Math.round(avgChange)} point quarterly change rate for ${waves.length > 2 ? 'continued' : 'future'} projections`,
        
        trends.filter(t => t.significance === 'high').length > 5
          ? `**Monitor Closely**: High volatility requires frequent re-evaluation of strategy`
          : `**Long-term Planning**: Low volatility enables longer planning horizons`
      ]
    };
  }
};

// ============================================================================
// TEMPLATE 4: COMPETITIVE COMPARISON
// ============================================================================

const CompetitiveComparisonTemplate: AnalysisTemplate = {
  name: 'Competitive Comparison',
  description: 'Compare multiple brands or products within a category',
  
  applicableWhen: (crosstab) => {
    // Applies when columns represent different brands/competitors
    return crosstab.columns.length >= 2 && 
           crosstab.rows.some(r => r.name.toLowerCase().includes('consider') || 
                                   r.name.toLowerCase().includes('brand') ||
                                   r.name.toLowerCase().includes('use'));
  },
  
  analyze: (crosstab, analysis) => {
    const competitors = crosstab.columns;
    const data = crosstab.data || [];
    
    // Analyze each competitor
    const competitorProfiles: { [key: string]: any } = {};
    
    competitors.forEach(comp => {
      const compData = data.filter(d => 
        d.audience === comp.id || d.audience?.includes(comp.id)
      );
      
      const validData = compData.filter(d => d.metrics.positive_sample >= 50);
      
      const avgIndex = validData.length > 0
        ? Math.round(validData.reduce((sum, d) => 
            sum + d.metrics.audience_index, 0
          ) / validData.length)
        : 0;
      
      const topStrengths = validData
        .sort((a, b) => b.metrics.audience_index - a.metrics.audience_index)
        .slice(0, 5);
      
      const totalSample = compData.reduce((sum, d) => 
        sum + d.metrics.positive_sample, 0
      );
      
      competitorProfiles[comp.name] = {
        id: comp.id,
        avgIndex,
        topStrengths,
        sampleSize: totalSample,
        dataPoints: compData.length
      };
    });
    
    // Find competitive advantages (unique strengths)
    const competitiveAdvantages: { [key: string]: any[] } = {};
    
    competitors.forEach(comp => {
      const profile = competitorProfiles[comp.name];
      const advantages = [];
      
      profile.topStrengths.forEach(strength => {
        // Check if this strength is unique to this competitor
        const othersWithStrength = competitors.filter(otherComp => {
          if (otherComp.name === comp.name) return false;
          const otherProfile = competitorProfiles[otherComp.name];
          return otherProfile.topStrengths.some(s => 
            s.datapoint === strength.datapoint && 
            s.metrics.audience_index > 120
          );
        });
        
        if (othersWithStrength.length === 0 && strength.metrics.audience_index > 130) {
          advantages.push(strength);
        }
      });
      
      competitiveAdvantages[comp.name] = advantages;
    });
    
    // Identify leader
    const leader = competitors.reduce((best, comp) => {
      const bestProfile = competitorProfiles[best.name];
      const compProfile = competitorProfiles[comp.name];
      return compProfile.avgIndex > bestProfile.avgIndex ? comp : best;
    });
    
    return {
      summary: `Competitive analysis of ${competitors.length} brands/products. ${leader.name} leads with average index of ${competitorProfiles[leader.name].avgIndex}.`,
      
      keyMetrics: competitors.map(comp => {
        const profile = competitorProfiles[comp.name];
        return {
          label: comp.name,
          value: `Index: ${profile.avgIndex}`,
          context: `${profile.dataPoints} behaviors analyzed`,
          significance: profile.avgIndex > 110 ? 'positive' : 
                       profile.avgIndex < 90 ? 'negative' : 'neutral'
        };
      }),
      
      insights: [
        `**Market Leader**: ${leader.name} shows strongest overall performance (avg index: ${competitorProfiles[leader.name].avgIndex})`,
        
        ...competitors.map(comp => {
          const advantages = competitiveAdvantages[comp.name];
          const profile = competitorProfiles[comp.name];
          
          return `**${comp.name}**: ${advantages.length > 0 
            ? `${advantages.length} unique strength(s) - differentiated positioning` 
            : 'No unique strengths - consider repositioning'} | Top behavior: index ${profile.topStrengths[0]?.metrics.audience_index || 'N/A'}`;
        }),
        
        `**Competitive Dynamics**: ${Object.values(competitiveAdvantages).filter(a => a.length > 0).length} of ${competitors.length} competitors have clear differentiation`,
        
        `**Market Structure**: ${competitorProfiles[leader.name].avgIndex - Math.min(...competitors.map(c => competitorProfiles[c.name].avgIndex))} point gap between leader and follower`
      ],
      
      recommendations: [
        `**If you are ${leader.name}**: Defend leadership by investing in top ${competitiveAdvantages[leader.name]?.length || 0} unique strengths`,
        
        ...competitors.filter(c => c.name !== leader.name).map(comp => {
          const advantages = competitiveAdvantages[comp.name];
          return advantages.length > 0
            ? `**If you are ${comp.name}**: Lean into ${advantages.length} unique strength(s) for differentiation`
            : `**If you are ${comp.name}**: Develop new positioning - current approach lacks differentiation`;
        }),
        
        `**Category Strategy**: ${Object.values(competitiveAdvantages).flat().length > competitors.length * 2
          ? 'Fragmented market with room for multiple winners in different niches'
          : 'Concentrated market - consider alliance or acquisition strategies'}`,
        
        `**Watch List**: Monitor ${leader.name}'s top behaviors for early warning of competitive threats`
      ]
    };
  }
};

// ============================================================================
// TEMPLATE 5: MEDIA CONSUMPTION ANALYSIS
// ============================================================================

const MediaConsumptionTemplate: AnalysisTemplate = {
  name: 'Media & Platform Analysis',
  description: 'Analyze media consumption, platform usage, and content preferences',
  
  applicableWhen: (crosstab) => {
    const hasMediaData = crosstab.rows.some(r => 
      r.name.toLowerCase().includes('social') ||
      r.name.toLowerCase().includes('platform') ||
      r.name.toLowerCase().includes('media') ||
      r.id.includes('q420') ||
      r.id.includes('q42011')
    );
    return hasMediaData;
  },
  
  analyze: (crosstab, analysis) => {
    const data = crosstab.data || [];
    const validData = data.filter(d => d.metrics.positive_sample >= 50);
    
    // Categorize media types
    const socialMedia = validData.filter(d => 
      d.datapoint.includes('q42011') || 
      ['facebook', 'instagram', 'tiktok', 'twitter', 'linkedin', 'youtube', 'snapchat']
        .some(platform => d.datapoint.toLowerCase().includes(platform))
    );
    
    const traditional = validData.filter(d =>
      ['tv', 'television', 'radio', 'newspaper', 'magazine', 'print']
        .some(medium => d.datapoint.toLowerCase().includes(medium))
    );
    
    const digital = validData.filter(d =>
      ['stream', 'podcast', 'ott', 'vod', 'online video']
        .some(medium => d.datapoint.toLowerCase().includes(medium))
    );
    
    // Find dominant platforms
    const dominant = validData
      .filter(d => d.metrics.audience_index > 130)
      .sort((a, b) => b.metrics.audience_index - a.metrics.audience_index);
    
    // Calculate media mix
    const totalSocial = socialMedia.reduce((sum, d) => 
      sum + d.metrics.audience_percentage, 0
    ) / Math.max(socialMedia.length, 1);
    
    const totalTraditional = traditional.reduce((sum, d) => 
      sum + d.metrics.audience_percentage, 0
    ) / Math.max(traditional.length, 1);
    
    const totalDigital = digital.reduce((sum, d) => 
      sum + d.metrics.audience_percentage, 0
    ) / Math.max(digital.length, 1);
    
    // Determine media archetype
    const mediaArchetype = totalSocial > totalTraditional && totalSocial > totalDigital 
      ? 'Social-First'
      : totalDigital > totalTraditional 
      ? 'Digital-Native'
      : 'Multi-Channel';
    
    return {
      summary: `${mediaArchetype} media profile with ${dominant.length} dominant platforms. ${socialMedia.length} social, ${digital.length} digital, ${traditional.length} traditional touchpoints analyzed.`,
      
      keyMetrics: [
        {
          label: 'Media Archetype',
          value: mediaArchetype,
          context: 'Primary consumption pattern',
          significance: 'neutral'
        },
        {
          label: 'Social Media Affinity',
          value: `${Math.round(totalSocial)}%`,
          context: `Across ${socialMedia.length} platforms`,
          significance: totalSocial > 60 ? 'positive' : 'neutral'
        },
        {
          label: 'Digital Media Affinity',
          value: `${Math.round(totalDigital)}%`,
          context: `Across ${digital.length} channels`,
          significance: totalDigital > 50 ? 'positive' : 'neutral'
        },
        {
          label: 'Dominant Platforms',
          value: dominant.length,
          context: 'With index >130',
          significance: 'positive'
        }
      ],
      
      insights: [
        dominant.length > 0
          ? `**Must-Have Channels**: ${dominant.slice(0, 4).map(d => {
              const row = crosstab.rows.find(r => d.datapoint.includes(r.id));
              return `${row?.name || d.datapoint} (${Math.round(d.metrics.audience_index)})`;
            }).join(', ')}`
          : `**Fragmented Consumption**: No single dominant platform - omnichannel approach required`,
        
        socialMedia.length > 0
          ? `**Social Media**: ${socialMedia.filter(d => d.metrics.audience_index > 120).length}/${socialMedia.length} platforms over-index. Top: ${socialMedia.sort((a, b) => b.metrics.audience_index - a.metrics.audience_index)[0]?.datapoint}`
          : `**Limited Social**: Low social media engagement - consider alternative channels`,
        
        `**Media Mix Balance**: ${Math.round((totalSocial + totalDigital) / (totalSocial + totalDigital + totalTraditional) * 100)}% digital vs traditional`,
        
        mediaArchetype === 'Social-First'
          ? `**Platform Strategy**: Prioritize social-native content and influencer partnerships`
          : mediaArchetype === 'Digital-Native'
          ? `**Platform Strategy**: Invest in streaming, OTT, and programmatic digital`
          : `**Platform Strategy**: Integrated approach across channels required for reach`
      ],
      
      recommendations: [
        `**Channel Priority**: Focus 70% of media budget on ${dominant.slice(0, 3).map(d => d.datapoint).join(', ')}`,
        
        dominant.filter(d => socialMedia.some(s => s.datapoint === d.datapoint)).length > 2
          ? `**Creative Format**: Prioritize short-form, social-native content for ${dominant.filter(d => socialMedia.some(s => s.datapoint === d.datapoint)).length} high-index social platforms`
          : `**Creative Format**: Long-form content may resonate better given lower social media dominance`,
        
        `**Budget Allocation**: ${Math.round(totalSocial / (totalSocial + totalDigital + totalTraditional) * 100)}% social, ${Math.round(totalDigital / (totalSocial + totalDigital + totalTraditional) * 100)}% digital, ${Math.round(totalTraditional / (totalSocial + totalDigital + totalTraditional) * 100)}% traditional`,
        
        dominant.length < 3
          ? `**Diversification**: Limited dominant platforms suggest experimental budget for channel discovery`
          : `**Concentration**: Strong platform affinity enables concentrated media approach`
      ]
    };
  }
};

// ============================================================================
// TEMPLATE REGISTRY & SELECTOR
// ============================================================================

class TemplateAnalysisEngine {
  private templates: AnalysisTemplate[] = [
    AudienceProfilingTemplate,
    MarketComparisonTemplate,
    TrendAnalysisTemplate,
    CompetitiveComparisonTemplate,
    MediaConsumptionTemplate
  ];
  
  /**
   * Select the most appropriate template(s) for a crosstab
   */
  selectTemplates(crosstab: any): AnalysisTemplate[] {
    return this.templates.filter(template => 
      template.applicableWhen(crosstab)
    );
  }
  
  /**
   * Apply a template to analyze a crosstab
   */
  applyTemplate(
    template: AnalysisTemplate,
    crosstab: any,
    baseAnalysis: any
  ): TemplateAnalysis {
    return template.analyze(crosstab, baseAnalysis);
  }
  
  /**
   * Apply all applicable templates
   */
  analyzeWithTemplates(crosstab: any, baseAnalysis: any): {
    [templateName: string]: TemplateAnalysis
  } {
    const applicable = this.selectTemplates(crosstab);
    const results: { [key: string]: TemplateAnalysis } = {};
    
    applicable.forEach(template => {
      results[template.name] = this.applyTemplate(
        template,
        crosstab,
        baseAnalysis
      );
    });
    
    return results;
  }
  
  /**
   * Format template analysis as readable text
   */
  formatTemplateAnalysis(
    templateName: string,
    analysis: TemplateAnalysis
  ): string {
    let output = `## ${templateName}\n\n`;
    
    output += `${analysis.summary}\n\n`;
    
    if (analysis.keyMetrics.length > 0) {
      output += `### Key Metrics\n\n`;
      analysis.keyMetrics.forEach(metric => {
        const emoji = metric.significance === 'positive' ? '🟢' :
                     metric.significance === 'negative' ? '🔴' : '⚪';
        output += `${emoji} **${metric.label}**: ${metric.value}\n`;
        if (metric.context) {
          output += `   ${metric.context}\n`;
        }
        output += '\n';
      });
    }
    
    if (analysis.insights.length > 0) {
      output += `### Insights\n\n`;
      analysis.insights.forEach(insight => {
        output += `${insight}\n\n`;
      });
    }
    
    if (analysis.recommendations.length > 0) {
      output += `### Recommendations\n\n`;
      analysis.recommendations.forEach((rec, i) => {
        output += `${i + 1}. ${rec}\n\n`;
      });
    }
    
    return output;
  }
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

const templateEngine = new TemplateAnalysisEngine();

// Determine which templates apply to a crosstab
// const applicableTemplates = templateEngine.selectTemplates(crosstab);
// console.log('Applicable templates:', applicableTemplates.map(t => t.name));

// Apply all applicable templates
// const templateResults = templateEngine.analyzeWithTemplates(crosstab, baseAnalysis);

// Format results
// Object.entries(templateResults).forEach(([name, analysis]) => {
//   const formatted = templateEngine.formatTemplateAnalysis(name, analysis);
//   console.log(formatted);
// });

export {
  TemplateAnalysisEngine,
  AudienceProfilingTemplate,
  MarketComparisonTemplate,
  TrendAnalysisTemplate,
  CompetitiveComparisonTemplate,
  MediaConsumptionTemplate
};