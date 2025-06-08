from typing import Optional
import torch
import torch.nn as nn
from transformers import Dinov2WithRegistersConfig, Dinov2WithRegistersPreTrainedModel, Dinov2WithRegistersPreTrainedModel, Dinov2WithRegistersModel
from transformers.modeling_outputs import ImageClassifierOutput

class CustomDinoV2ClassifierWithReg(Dinov2WithRegistersPreTrainedModel):
    def __init__(self, config: Dinov2WithRegistersConfig, num_classes, hidden_dim=None):
        super().__init__(config)
        self.backbone = Dinov2WithRegistersModel(config)
        embed_dim = self.backbone.config.hidden_size
        self.config = self.backbone.config 
        input_dim = embed_dim * 2 
        if hidden_dim:
            self.classifier = nn.Sequential(
                nn.Linear(input_dim, hidden_dim),
                nn.LayerNorm(hidden_dim), 
                nn.SiLU(),
                nn.Dropout(0.3),
                nn.Linear(hidden_dim, num_classes)
            )
        else:
            self.classifier = nn.Linear(input_dim, num_classes)

    def forward(
        self,
        pixel_values: Optional[torch.Tensor] = None,
        head_mask: Optional[torch.Tensor] = None,
        labels: Optional[torch.Tensor] = None,
        output_attentions: Optional[bool] = None,
        output_hidden_states: Optional[bool] = None,
        return_dict: Optional[bool] = True,
    ):
        outputs = self.backbone(
            pixel_values,
            head_mask=head_mask,
            output_attentions=output_attentions,
            output_hidden_states=output_hidden_states,
            return_dict=return_dict,
        )

        # (batch_size, sequence_length, hidden_size)
        sequence_output = outputs[0] 

        # Extract tokens
        cls_token = sequence_output[:, 0]

        patch_tokens = sequence_output[:, 1 + self.config.num_register_tokens :]  # Exclude register tokens

        # Combine [CLS] and mean of patch tokens
        linear_input = torch.cat([cls_token, patch_tokens.mean(dim=1)], dim=1)

        # Classifier head
        logits = self.classifier(linear_input)

        # Loss (if labels provided)
        loss = None
        if labels is not None:
            labels = labels.to(logits.device)
            loss = nn.CrossEntropyLoss()(logits, labels)

        # Output
        return ImageClassifierOutput(
            loss=loss,
            logits=logits,
            hidden_states=outputs.hidden_states if output_hidden_states else None,
            attentions=outputs.attentions if output_attentions else None,
        )