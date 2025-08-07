// Removed import of node-fetch as it's not needed with native fetch

type OpenAIResponse = {
  choices: {
    message: {
      content: string;
    };
  }[];
};

export class CompanyInfoService {
  static async fetchCompanyInfo(
    website: string,
  ): Promise<{ name: string; summary: string }> {
    console.log('\n=== 🚀 Starting Company Info Fetch ===');
    console.log('📌 Website:', website);

    try {
      // Ensure the API key is set
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not set in environment variables.');
      }

      // Extract domain name as fallback
      const domainName = this.extractDomainName(website);
      console.log('🏷️ Domain name fallback:', domainName);

      // Optional: Include organization ID if required
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      };

      if (process.env.OPENAI_ORGANIZATION_ID) {
        headers['OpenAI-Organization'] = process.env.OPENAI_ORGANIZATION_ID;
      }

      // Call OpenAI API using native fetch
      const openAiResponse = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert business analyst. Given a company website, you will return a JSON object with two keys: "name" and "summary". The "name" should be the company name, and the "summary" should be a concise one-paragraph summary of the company.',
              },
              {
                role: 'user',
                content: `Provide a summary for the company with the website: ${website}`,
              },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 250,
          }),
        },
      );

      if (!openAiResponse.ok) {
        const errorData = await openAiResponse.json();
        console.error('❌ OpenAI API Error Response:', errorData);
        const errorMessage =
          errorData &&
          typeof errorData === 'object' &&
          'error' in errorData &&
          typeof errorData.error === 'string'
            ? errorData.error
            : `Failed to fetch company info from OpenAI: ${openAiResponse.status} ${openAiResponse.statusText}`;
        throw new Error(errorMessage);
      }

      const openAiData: OpenAIResponse = await openAiResponse.json();
      if (
        !openAiData ||
        typeof openAiData !== 'object' ||
        !Array.isArray(openAiData.choices) ||
        !openAiData.choices[0]?.message?.content
      ) {
        throw new Error('Unexpected OpenAI response format');
      }

      console.log('✨ Received OpenAI data structure:', {
        choices: openAiData.choices?.length || 0,
      });

      const content = openAiData.choices[0].message.content;
      console.log('📄 Raw content from OpenAI:', content);
      console.log('📄 Content length:', content.length);

      let parsedContent;
      try {
        parsedContent = JSON.parse(content);
        console.log('✅ Successfully parsed JSON:', parsedContent);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Content that failed to parse:', content);
        throw new Error(
          `Failed to parse OpenAI response as JSON: ${parseError}`,
        );
      }

      // Use domain name fallback if AI returned "Unknown Company" or similar
      let companyName = parsedContent.name;
      let companySummary = parsedContent.summary;

      if (
        !companyName ||
        companyName.toLowerCase().includes('unknown') ||
        companyName.toLowerCase().includes('not found')
      ) {
        console.log('⚠️ Using domain name fallback for company name');
        companyName = domainName;
      }

      if (!companySummary) {
        console.log('⚠️ Using basic summary fallback');
        companySummary = `${companyName} is a company with the website ${website}.`;
      }

      console.log('🏢 Final company info:');
      console.log('   Name:', companyName);
      console.log('   Summary:', companySummary);
      console.log('=== ✅ Company Info Fetch Complete ===\n');

      return { name: companyName, summary: companySummary };
    } catch (error) {
      console.error('❌ Error in fetchCompanyInfo:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
      }

      // Fallback to domain name if everything fails
      console.log('🔄 Using emergency fallback to domain name');
      const domainName = this.extractDomainName(website);
      return {
        name: domainName,
        summary: `${domainName} is a company with the website ${website}.`,
      };
    }
  }

  // Helper method to extract domain name from website
  private static extractDomainName(website: string): string {
    try {
      // Remove protocol and www
      let domain = website
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '');

      // Remove everything after the first slash
      const domainPart = domain.split('/')[0];
      if (!domainPart) return 'Unknown Company';
      domain = domainPart;

      // Remove the TLD (top-level domain)
      const parts = domain.split('.');
      if (parts.length >= 2 && parts[0]) {
        // Take the main part (e.g., "vellora" from "vellora.ai")
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }

      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch (error) {
      console.error('Error extracting domain name:', error);
      return 'Unknown Company';
    }
  }
}
