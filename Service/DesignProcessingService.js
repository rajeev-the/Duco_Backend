/**
 * Design Processing Service
 * Handles custom t-shirt designs with text and images
 * Processes design data for printing and order fulfillment
 */

class DesignProcessingService {
  constructor() {
    this.baseURL = 'https://api.printrove.com/api/external';
  }

  /**
   * Process design data from frontend
   * @param {Object} designData - Design data from frontend
   * @returns {Object} Processed design data
   */
  processDesignData(designData) {
    console.log('🎨 Processing design data:', {
      hasFront: !!designData.front,
      hasBack: !!designData.back,
      hasFrontImage: !!designData.frontImage,
      hasBackImage: !!designData.backImage,
    });

    const processedDesign = {
      front: this.processSideDesign(designData.front, 'front'),
      back: this.processSideDesign(designData.back, 'back'),
      metadata: {
        hasText: !!(
          designData.front?.customText || designData.back?.customText
        ),
        hasImages: !!(designData.frontImage || designData.backImage),
        textCount: this.countTextElements(designData),
        imageCount: this.countImageElements(designData),
      },
    };

    console.log('✅ Processed design:', {
      frontText: processedDesign.front.text,
      backText: processedDesign.back.text,
      hasImages: processedDesign.metadata.hasImages,
      textCount: processedDesign.metadata.textCount,
    });

    return processedDesign;
  }

  /**
   * Process design for one side (front/back)
   * @param {Object} sideData - Side design data
   * @param {string} side - Side name (front/back)
   * @returns {Object} Processed side design
   */
  processSideDesign(sideData, side) {
    if (!sideData) {
      return { text: null, image: null, hasContent: false };
    }

    const processed = {
      text: null,
      image: null,
      hasContent: false,
    };

    // Process text data
    if (sideData.customText && sideData.customText.trim()) {
      processed.text = {
        content: sideData.customText.trim(),
        size: sideData.textSize || 24,
        color: sideData.textColor || '#000000',
        font: sideData.font || 'font-sans',
        position: sideData.positions?.[`custom-text-${side}`] || {
          x: 50,
          y: 30,
        },
      };
      processed.hasContent = true;
    }

    // Process image data
    if (sideData.uploadedImage) {
      processed.image = {
        data: sideData.uploadedImage,
        size: sideData.imageSize || 100,
        position: sideData.positions?.[`image-${side}`] || { x: 50, y: 30 },
      };
      processed.hasContent = true;
    }

    return processed;
  }

  /**
   * Count text elements in design
   * @param {Object} designData - Design data
   * @returns {number} Text element count
   */
  countTextElements(designData) {
    let count = 0;
    if (designData.front?.customText?.trim()) count++;
    if (designData.back?.customText?.trim()) count++;
    return count;
  }

  /**
   * Count image elements in design
   * @param {Object} designData - Design data
   * @returns {number} Image element count
   */
  countImageElements(designData) {
    let count = 0;
    if (designData.front?.uploadedImage) count++;
    if (designData.back?.uploadedImage) count++;
    if (designData.frontImage) count++;
    if (designData.backImage) count++;
    return count;
  }

  /**
   * Generate design summary for order
   * @param {Object} designData - Design data
   * @returns {Object} Design summary
   */
  generateDesignSummary(designData) {
    const processed = this.processDesignData(designData);

    return {
      type: 'custom-design',
      hasText: processed.metadata.hasText,
      hasImages: processed.metadata.hasImages,
      textCount: processed.metadata.textCount,
      imageCount: processed.metadata.imageCount,
      frontText: processed.front.text?.content || null,
      backText: processed.back.text?.content || null,
      summary: this.createDesignSummary(processed),
    };
  }

  /**
   * Create human-readable design summary
   * @param {Object} processedDesign - Processed design data
   * @returns {string} Design summary
   */
  createDesignSummary(processedDesign) {
    const parts = [];

    if (processedDesign.front.text) {
      parts.push(`Front: "${processedDesign.front.text.content}"`);
    }
    if (processedDesign.back.text) {
      parts.push(`Back: "${processedDesign.back.text.content}"`);
    }
    if (processedDesign.metadata.hasImages) {
      parts.push(`${processedDesign.metadata.imageCount} image(s)`);
    }

    return parts.length > 0 ? parts.join(', ') : 'Plain design';
  }

  /**
   * Validate design data
   * @param {Object} designData - Design data
   * @returns {Object} Validation result
   */
  validateDesignData(designData) {
    const errors = [];
    const warnings = [];

    // Check if design has any content
    const hasContent =
      this.countTextElements(designData) > 0 ||
      this.countImageElements(designData) > 0;

    if (!hasContent) {
      warnings.push('No text or images found in design');
    }

    // Check text content
    if (
      designData.front?.customText &&
      designData.front.customText.length > 100
    ) {
      warnings.push('Front text is very long (>100 characters)');
    }
    if (
      designData.back?.customText &&
      designData.back.customText.length > 100
    ) {
      warnings.push('Back text is very long (>100 characters)');
    }

    // Check image data
    if (designData.frontImage && designData.frontImage.length > 1000000) {
      // ~1MB
      warnings.push('Front image is very large');
    }
    if (designData.backImage && designData.backImage.length > 1000000) {
      warnings.push('Back image is very large');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasContent,
    };
  }

  /**
   * Create print-ready design data
   * @param {Object} designData - Design data
   * @returns {Object} Print-ready design data
   */
  createPrintReadyDesign(designData) {
    const processed = this.processDesignData(designData);

    return {
      front: {
        text: processed.front.text,
        image: processed.front.image,
        hasContent: processed.front.hasContent,
      },
      back: {
        text: processed.back.text,
        image: processed.back.image,
        hasContent: processed.back.hasContent,
      },
      metadata: processed.metadata,
      printInstructions: this.generatePrintInstructions(processed),
    };
  }

  /**
   * Generate print instructions
   * @param {Object} processedDesign - Processed design data
   * @returns {Object} Print instructions
   */
  generatePrintInstructions(processedDesign) {
    const instructions = {
      front: null,
      back: null,
      specialInstructions: [],
    };

    // Front side instructions
    if (processedDesign.front.hasContent) {
      instructions.front = {
        hasText: !!processedDesign.front.text,
        hasImage: !!processedDesign.front.image,
        textContent: processedDesign.front.text?.content || null,
        textColor: processedDesign.front.text?.color || null,
        textSize: processedDesign.front.text?.size || null,
      };
    }

    // Back side instructions
    if (processedDesign.back.hasContent) {
      instructions.back = {
        hasText: !!processedDesign.back.text,
        hasImage: !!processedDesign.back.image,
        textContent: processedDesign.back.text?.content || null,
        textColor: processedDesign.back.text?.color || null,
        textSize: processedDesign.back.text?.size || null,
      };
    }

    // Special instructions
    if (processedDesign.metadata.textCount > 0) {
      instructions.specialInstructions.push('Custom text printing required');
    }
    if (processedDesign.metadata.imageCount > 0) {
      instructions.specialInstructions.push('Custom image printing required');
    }

    return instructions;
  }
}

module.exports = new DesignProcessingService();
